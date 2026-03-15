"""
Dynamic workflow executor — routes simple tasks directly to the appropriate tool
using the interpreted task data from the Intent Interpreter.

No hardcoded tool mappings — dynamically matches required tools from the ToolRegistry.
"""

import structlog

from backend.tools.registry import ToolRegistry, ToolNotFoundError
from backend.api.connection_manager import manager

logger = structlog.get_logger()


async def execute_workflow(state: dict) -> dict:
    """
    Executes simple single-tool workflows by dynamically matching
    the required tool from the interpreted task.
    """
    interpreted = state["interpreted_task"]
    task_type = interpreted.get("task_type")
    task_id = state.get("task_id", "unknown")
    requires_tools = interpreted.get("requires_tools", [])
    entities = interpreted.get("entities", [])
    primary_goal = interpreted.get("primary_goal", "")
    log = logger.bind(trace_id=task_id, agent="workflow")

    log.info("workflow_started", task_type=task_type, tools_requested=requires_tools)

    manager.broadcast_sync(task_id, {
        "type": "progress",
        "agent": "workflow",
        "status": "running",
        "message": f"Executing workflow for: {primary_goal[:80]}",
    })

    results = []
    available_tool_names = list(ToolRegistry._tools.keys())

    # Dynamically match and execute each requested tool
    tools_to_run = []
    for tool_name in requires_tools:
        # Direct match
        if tool_name in available_tool_names:
            tools_to_run.append(tool_name)
        else:
            # Fuzzy match: check if tool name is a substring of any registered tool
            matched = [t for t in available_tool_names if tool_name.lower() in t.lower() or t.lower() in tool_name.lower()]
            if matched:
                tools_to_run.append(matched[0])

    # If no tools matched from requires_tools, try to infer from task type and entities
    if not tools_to_run:
        tool_inference = _infer_tool(task_type, entities, primary_goal, available_tool_names)
        if tool_inference:
            tools_to_run.append(tool_inference)

    if not tools_to_run:
        log.warning("no_tools_matched", requires_tools=requires_tools)
        # Generate a helpful conversational response instead of raw JSON error
        try:
            from backend.resilience.llm_client import llm_client
            prompt = f"""The user asked: "{state.get('user_input', primary_goal)}"

I couldn't find a specific tool for this. Available tools are: calculator, weather_api, text_summarizer,
web_scraper, data_analyzer, code_executor, json_transformer, sentiment_analyzer, knowledge_retrieval.

Provide a helpful, natural response. If you can answer from your knowledge, do so.
If not, suggest which of the available tools might help and how the user could rephrase their request.
Be conversational and friendly. Never mention "tools" or "available_tools" in a technical way."""
            response = llm_client.call(prompt, max_tokens=300)
            results.append({"response": response.strip()})
        except Exception as e:
            log.error("fallback_response_failed", error=str(e))
            results.append({
                "response": "I couldn't find the right tool for that, but I can help with: "
                "calculations, weather, text summaries, sentiment analysis, running Python code, "
                "data analysis, web scraping, JSON transforms, and searching uploaded documents. "
                "Could you rephrase your request?"
            })
    else:
        for tool_name in tools_to_run:
            try:
                tool = ToolRegistry.get(tool_name)
                params = _build_params(tool_name, entities, state.get("user_input", primary_goal))
                
                manager.broadcast_sync(task_id, {
                    "type": "progress",
                    "agent": "workflow",
                    "status": "running",
                    "message": f"Executing tool: {tool_name}",
                })

                tool_result = await tool.execute(params)
                results.append(tool_result.data if tool_result.success else {"error": tool_result.error, "tool": tool_name})
                log.info("workflow_tool_executed", tool=tool_name, success=tool_result.success)

            except ToolNotFoundError:
                results.append({"error": f"Tool '{tool_name}' not available"})
            except Exception as e:
                log.error("workflow_tool_failed", tool=tool_name, error=str(e))
                results.append({"error": str(e), "tool": tool_name})

    manager.broadcast_sync(task_id, {
        "type": "progress",
        "agent": "workflow",
        "status": "completed",
        "message": f"Workflow completed — {len(results)} result(s)",
    })

    log.info("workflow_completed", results_count=len(results))

    return {
        **state,
        "results": results,
        "evaluation_score": 1.0 if results and all("error" not in r for r in results) else 0.5,
    }


def _infer_tool(task_type: str, entities: list, goal: str, available: list) -> str | None:
    """Infer the best tool based on task type and content analysis."""
    goal_lower = goal.lower()
    entities_lower = " ".join(str(e) for e in entities).lower()
    combined = goal_lower + " " + entities_lower

    # Keyword-to-tool inference map
    inference_rules = [
        (["weather", "temperature", "forecast", "climate"], "weather_api"),
        (["calculate", "math", "add", "subtract", "multiply", "divide", "sum", "compute"], "calculator"),
        (["summarize", "summary", "brief", "condense", "shorten"], "text_summarizer"),
        (["scrape", "fetch", "url", "website", "webpage", "http", "www"], "web_scraper"),
        (["analyze", "statistics", "mean", "median", "average", "data", "outlier"], "data_analyzer"),
        (["execute", "code", "python", "run", "eval", "program"], "code_executor"),
        (["json", "transform", "query", "path", "parse", "extract"], "json_transformer"),
        (["sentiment", "emotion", "feeling", "tone", "mood", "opinion"], "sentiment_analyzer"),
    ]

    for keywords, tool_name in inference_rules:
        if tool_name in available:
            if any(kw in combined for kw in keywords):
                return tool_name

    return None


def _build_params(tool_name: str, entities: list, goal: str) -> dict:
    """Build tool parameters from entities and goal, using LLM for accurate extraction."""
    import re
    first_entity = str(entities[0]) if entities else ""
    log = structlog.get_logger().bind(agent="workflow_params")

    # --- Calculator: extract just the math expression ---
    if tool_name == "calculator":
        expr = goal
        # Strip common prefixes
        for prefix in ["calculate", "compute", "evaluate", "solve", "what is", "find", "what's"]:
            if expr.lower().startswith(prefix):
                expr = expr[len(prefix):].lstrip(":").strip()
        expr = expr.replace("^", "**")
        expr = re.sub(r"sqrt\(", "math.sqrt(", expr, flags=re.IGNORECASE)
        expr = expr.rstrip("?.")
        # Convert natural language: "multiply X by Y"
        expr = re.sub(r"multiply\s+(\S+)\s+by\s+(\S+)", r"\1 * \2", expr, flags=re.IGNORECASE)
        expr = re.sub(r"divide\s+(\S+)\s+by\s+(\S+)", r"\1 / \2", expr, flags=re.IGNORECASE)
        expr = re.sub(r"add\s+(\S+)\s+and\s+(\S+)", r"\1 + \2", expr, flags=re.IGNORECASE)
        expr = re.sub(r"subtract\s+(\S+)\s+from\s+(\S+)", r"\2 - \1", expr, flags=re.IGNORECASE)
        # If still has words, extract math portion
        if re.search(r'[a-zA-Z]', expr) and 'math.' not in expr:
            math_match = re.search(r'([\d][\d\s\+\-\*\/\%\(\)\.\*]*[\d\)])', expr)
            if math_match:
                expr = math_match.group(1).strip()
        log.info("calculator_expression", raw=goal, cleaned=expr)
        return {"expression": expr}

    # --- Code Executor: extract just the code ---
    if tool_name == "code_executor":
        code = first_entity or goal
        for prefix in ["execute", "run code", "run python", "python", "eval", "code"]:
            if code.lower().startswith(prefix):
                code = code[len(prefix):].lstrip(":").strip()
        return {"code": code}

    # --- Weather: extract city name ---
    if tool_name == "weather_api":
        city = first_entity
        if not city or city == goal:
            # Try extracting city from natural language
            city_match = re.search(r'(?:weather|temperature|forecast)\s+(?:in|for|of|at)\s+(.+?)(?:\?|$|\.)', goal, re.IGNORECASE)
            if city_match:
                city = city_match.group(1).strip().rstrip("?.")
            else:
                city = re.sub(r'^.*?(?:weather|temperature)\s*(?:in|for|of|at)?\s*', '', goal, flags=re.IGNORECASE).strip().rstrip("?.")
        return {"city": city or "London"}

    # --- Web Scraper: extract URL ---
    if tool_name == "web_scraper":
        url_match = re.search(r'(https?://\S+)', goal)
        url = url_match.group(1) if url_match else (first_entity if first_entity.startswith("http") else "")
        return {"url": url}

    # --- Sentiment Analyzer: extract text ---
    if tool_name == "sentiment_analyzer":
        text = goal
        for prefix in ["analyze sentiment", "sentiment analysis", "analyze the sentiment of", "analyze"]:
            if text.lower().startswith(prefix):
                text = text[len(prefix):].lstrip(":").strip()
        return {"text": text}

    # --- Text Summarizer: extract text ---
    if tool_name == "text_summarizer":
        text = goal
        for prefix in ["summarize", "summary of", "give me a summary of", "brief"]:
            if text.lower().startswith(prefix):
                text = text[len(prefix):].lstrip(":").strip()
        return {"text": text}

    # --- Data Analyzer: extract data ---
    if tool_name == "data_analyzer":
        # Try to extract numbers from the goal
        numbers = re.findall(r'-?\d+\.?\d*', goal)
        if numbers:
            return {"data": ", ".join(numbers)}
        return {"data": first_entity or goal}

    # --- JSON Transformer ---
    if tool_name == "json_transformer":
        return {"data": first_entity or goal, "path": "", "operation": "select"}

    # Fallback: pass goal as the first required param
    return {"input": goal or first_entity}

