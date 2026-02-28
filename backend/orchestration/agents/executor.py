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
            
            response = llm_client.call(prompt, max_tokens=500)
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

        # Use LLM to extract the right parameters for the tool
        tool_schema = tool.get_schema()
        prompt = f"""Extract parameters from this task for the tool.

User's original request: "{user_input}"
Step description: "{current_step.get('description', '')}"

The tool "{tool_needed}" expects parameters matching this JSON schema:
{json.dumps(tool_schema, indent=2)}

Return ONLY a JSON object with the required parameters.
Example: {{"city": "London"}} or {{"expression": "2 + 3 * 4"}}

IMPORTANT: For calculator, extract the FULL mathematical expression from the user's request.
For example, if the user says "multiply 3 by 4", return {{"expression": "3 * 4"}}.
"""

        try:
            raw_params = llm_client.call(prompt, max_tokens=200)
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

        tool_result = await tool.execute(params)
        result = tool_result.data if tool_result.success else {"error": tool_result.error}
        log.info("tool_executed", tool=tool_needed, success=tool_result.success)

    except ToolNotFoundError:
        log.warning("tool_not_found", tool=tool_needed)
        # Instead of returning a JSON error, generate a conversational fallback
        try:
            prompt = f"""The user asked: "{user_input}"
I couldn't find the specific tool "{tool_needed}" to handle this. 
Please provide a helpful response based on your knowledge."""
            response = llm_client.call(prompt, max_tokens=400)
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
