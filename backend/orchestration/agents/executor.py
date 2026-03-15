import json
import structlog
from pydantic import BaseModel, ValidationError

from backend.resilience.llm_client import llm_client
from backend.tools.registry import ToolRegistry, ToolNotFoundError
from backend.api.connection_manager import manager
import asyncio

logger = structlog.get_logger()


class ExtractedParams(BaseModel):
    """Generic parameter extraction result from LLM."""
    params: dict


async def execute_step(state: dict) -> dict:
    """
    Executes one step of the plan using the plugin-based ToolRegistry.
    Handles conversational messages (no tool needed) with direct LLM response.
    """
    plan = state.get("plan", {})
    current_step_idx = state.get("current_step", 0)
    steps = plan.get("steps", [])
    task_id = state.get("task_id", "unknown")
    user_input = state.get("user_input", "")
    log = logger.bind(trace_id=task_id, agent="executor")

    if current_step_idx >= len(steps):
        log.info("all_steps_completed")
        return {**state}

    current_step = steps[current_step_idx]
    tool_needed = current_step.get("tool_needed", "")

    log.info(
        "step_started",
        step=current_step_idx + 1,
        total_steps=len(steps),
        tool=tool_needed,
    )

    manager.broadcast_sync(task_id, {
        "type": "progress",
        "agent": "executor",
        "status": "running",
        "message": f"Step {current_step_idx + 1}/{len(steps)}: {current_step.get('description', 'Executing...')}"
    })

    result = None

    # Handle conversational messages where no tool is needed
    if not tool_needed or tool_needed.lower() in ("none", "null", "n/a", "no_tool", ""):
        log.info("no_tool_needed_conversational_response")
        try:
            conversation_context = state.get("conversation_context", "")
            prompt = f"""You are a helpful AI assistant. Respond naturally to the user's message.

{f'Previous conversation:{chr(10)}{conversation_context}{chr(10)}' if conversation_context else ''}
User: {user_input}

Provide a helpful, natural, conversational response. Be friendly and informative."""
            
            response = llm_client.call(prompt, max_tokens=300)
            result = {"response": response.strip()}
        except Exception as e:
            log.error("conversational_response_failed", error=str(e))
            result = {"response": "I'm here to help! Could you tell me more about what you'd like to do?"}

        manager.broadcast_sync(task_id, {
            "type": "progress",
            "agent": "executor",
            "status": "completed",
            "message": f"Step {current_step_idx + 1} completed"
        })

        results = list(state.get("results", []))
        results.append(result)

        return {
            **state,
            "results": results,
            "current_step": current_step_idx + 1,
            "total_cost": state.get("total_cost", 0) + 0.0,
        }

    # Tool-based execution
    try:
        tool = ToolRegistry.get(tool_needed)

        # Gather previous step results for multi-step chaining
        previous_results = state.get("results", [])
        prev_context = ""
        if previous_results:
            import json as _json
            prev_context = f"""
Previous step results (use these if the current step depends on earlier output):
{_json.dumps(previous_results, indent=2, default=str)[:2000]}
"""

        # Use LLM to extract the right parameters for the tool
        tool_schema = tool.get_schema()
        prompt = f"""Extract ONLY the parameter values for the tool from the user's request.

User request: "{user_input}"
Step: "{current_step.get('description', '')}"
{prev_context}
Tool: "{tool_needed}"
Schema: {json.dumps(tool_schema, indent=2)}

CRITICAL RULES:
- Return ONLY a JSON object with the required parameter keys and their values.
- For "calculator" / "expression": extract ONLY the math expression, no words. "Calculate 345*87" → {{"expression": "345*87"}}
- For "code_executor" / "code": extract ONLY the Python code. "Execute: [x**2 for x in range(10)]" → {{"code": "[x**2 for x in range(10)]"}}
- For "weather_api" / "city": extract ONLY the city name. "Weather in Mumbai" → {{"city": "Mumbai"}}
- For "text_summarizer" / "text": extract the text to summarize (remove "Summarize:" prefix).
- For "sentiment_analyzer" / "text": extract the text (remove "Analyze sentiment:" prefix).
- For "web_scraper" / "url": extract ONLY the URL.
- For "data_analyzer" / "data": extract the numbers as a comma-separated string.
- NEVER include prefixes like "Calculate", "Execute:", "Run code:", "Analyze sentiment:" in the parameter value.

Return ONLY valid JSON, nothing else."""

        try:
            raw_params = llm_client.call(prompt, max_tokens=300)
            # Strip markdown fences if present
            cleaned = raw_params.strip()
            if cleaned.startswith("```"):
                lines = cleaned.split("\n")
                lines = [l for l in lines if not l.strip().startswith("```")]
                cleaned = "\n".join(lines)
            params = json.loads(cleaned)
        except (json.JSONDecodeError, Exception) as e:
            log.warning("param_extraction_fallback", error=str(e))
            # Fallback: try to use the user input as the main parameter
            required = tool_schema.get("required", [])
            params = {required[0]: user_input} if required else {}

        # ── Post-processing: sanitize extracted parameters ──
        import re as _re
        if tool_needed == "calculator" and "expression" in params:
            expr = params["expression"]
            # Strip common language prefixes
            for prefix in ["calculate", "compute", "evaluate", "solve", "what is", "find"]:
                if expr.lower().startswith(prefix):
                    expr = expr[len(prefix):].lstrip(":").strip()
            expr = expr.replace("^", "**")
            expr = expr.rstrip("?.")
            params["expression"] = expr

        if tool_needed == "code_executor" and "code" in params:
            code = params["code"]
            for prefix in ["execute", "run code", "run python", "python", "eval", "code"]:
                if code.lower().startswith(prefix):
                    code = code[len(prefix):].lstrip(":").strip()
            params["code"] = code

        if tool_needed in ("text_summarizer", "sentiment_analyzer") and "text" in params:
            text = params["text"]
            for prefix in ["summarize", "analyze sentiment", "sentiment"]:
                if text.lower().startswith(prefix):
                    text = text[len(prefix):].lstrip(":").strip()
            params["text"] = text

        log.info("tool_params_extracted", tool=tool_needed, params=str(params)[:500])
        tool_result = await tool.execute(params)
        result = tool_result.data if tool_result.success else {"error": tool_result.error}
        log.info("tool_executed", tool=tool_needed, success=tool_result.success, result_preview=str(result)[:200])

    except ToolNotFoundError:
        log.warning("tool_not_found", tool=tool_needed)
        # Instead of returning a JSON error, generate a conversational fallback
        try:
            prompt = f"""The user asked: "{user_input}"
I couldn't find the specific tool "{tool_needed}" to handle this. 
Please provide a helpful response based on your knowledge."""
            response = llm_client.call(prompt, max_tokens=250)
            result = {"response": response.strip()}
        except Exception:
            result = {"response": f"I wasn't able to find the right tool for this task, but I'm working on it!"}
    except Exception as e:
        log.error("step_failed", tool=tool_needed, error=str(e))
        result = {"error": str(e), "tool": tool_needed}

    manager.broadcast_sync(task_id, {
        "type": "progress",
        "agent": "executor",
        "status": "completed",
        "message": f"Step {current_step_idx + 1} completed"
    })

    # Update state
    results = list(state.get("results", []))
    results.append(result)

    log.info("step_completed", step=current_step_idx + 1)

    return {
        **state,
        "results": results,
        "current_step": current_step_idx + 1,
        "total_cost": state.get("total_cost", 0) + 0.0,
    }
