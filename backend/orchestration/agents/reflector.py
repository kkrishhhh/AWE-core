import json
import structlog
from pydantic import ValidationError

from backend.resilience.llm_client import llm_client
from backend.schemas.agent_schemas import ReflectionResult
from backend.api.connection_manager import manager

logger = structlog.get_logger()


def reflect_on_progress(state: dict) -> dict:
    """
    Checks if we're making progress, suggests changes if stuck.
    Uses Pydantic validation for structured reflection output.
    Broadcasts progress via WebSocket for real-time streaming.
    """
    plan = state.get("plan", {})
    results = state.get("results", [])
    task_id = state.get("task_id", "unknown")
    log = logger.bind(trace_id=task_id, agent="reflector")

    log.info("agent_started", results_count=len(results))

    manager.broadcast_sync(task_id, {
        "type": "progress",
        "agent": "reflector",
        "status": "running",
        "message": "Evaluating progress and quality of results...",
    })

    prompt = f"""You are a reflection agent evaluating progress.

Original plan:
{json.dumps(plan, indent=2)}

Results collected so far:
{json.dumps(results, indent=2)}

Evaluate:
1. Are we making progress toward the goal?
2. Should we continue or are we done?
3. Any issues encountered?

Return JSON:
{{
    "continue": true or false,
    "reasoning": "brief reasoning",
    "suggested_changes": [] or ["change1", "change2"],
    "confidence": 0.0 to 1.0
}}

Return ONLY JSON."""

    try:
        reflection = llm_client.call_structured(prompt, ReflectionResult)
        log.info(
            "agent_completed",
            should_continue=reflection.continue_execution,
            confidence=reflection.confidence,
        )
        manager.broadcast_sync(task_id, {
            "type": "progress",
            "agent": "reflector",
            "status": "completed",
            "message": f"Reflection complete — confidence: {reflection.confidence:.0%}",
        })
    except (ValidationError, json.JSONDecodeError) as e:
        log.error("agent_failed", error=str(e))
        reflection = ReflectionResult(
            **{
                "continue": True,
                "reasoning": "Continuing with plan execution (reflection parse failed)",
                "suggested_changes": [],
                "confidence": 0.7,
            }
        )
        manager.broadcast_sync(task_id, {
            "type": "progress",
            "agent": "reflector",
            "status": "completed",
            "message": "Reflection complete — continuing execution",
        })

    return {
        **state,
        "total_cost": state.get("total_cost", 0) + 0.0,
    }
