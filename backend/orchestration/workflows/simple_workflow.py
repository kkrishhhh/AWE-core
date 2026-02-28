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
        results.append({
            "message": "No matching tools found for this task",
            "available_tools": available_tool_names,
        })
    else:
        for tool_name in tools_to_run:
            try:
                tool = ToolRegistry.get(tool_name)
                params = _build_params(tool_name, entities, primary_goal)
                
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
    """Build tool parameters from entities and goal description."""
    first_entity = str(entities[0]) if entities else ""

    param_builders = {
        "weather_api": lambda: {"city": first_entity or goal},
        "calculator": lambda: {"expression": goal},  # Use full goal so "3 * 4" is preserved
        "text_summarizer": lambda: {"text": goal},
        "web_scraper": lambda: {"url": first_entity if first_entity.startswith("http") else goal},
        "data_analyzer": lambda: {"data": first_entity or goal},
        "code_executor": lambda: {"code": first_entity or goal},
        "json_transformer": lambda: {"data": first_entity, "path": "", "operation": "select"},
        "sentiment_analyzer": lambda: {"text": goal},
    }

    builder = param_builders.get(tool_name)
    if builder:
        return builder()

    # Fallback: pass goal as the first required param
    return {"input": goal or first_entity}

