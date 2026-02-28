import json
import structlog
from pydantic import ValidationError

from backend.resilience.llm_client import llm_client
from backend.schemas.agent_schemas import RoutingDecision
from backend.api.connection_manager import manager
import asyncio

logger = structlog.get_logger()


async def route_task(state: dict) -> dict:
    """
    Decides whether to use workflow mode or agent mode using Pydantic validation.
    """
    interpreted = state["interpreted_task"]
    task_id = state.get("task_id", "unknown")
    log = logger.bind(trace_id=task_id, agent="router")

    log.info("agent_started", task_type=interpreted.get("task_type"))
    
    manager.broadcast_sync(task_id, {
        "type": "progress",
        "agent": "router",
        "status": "running",
        "message": "Determining execution strategy..."
    })

    prompt = f"""You are a routing agent that decides execution strategy.

Task details:
{json.dumps(interpreted, indent=2)}

Decision criteria:
- WORKFLOW mode: Task is straightforward, known APIs, deterministic
- AGENT mode: Task is complex, requires exploration, multiple steps, ambiguous

Return JSON:
{{
    "mode": "workflow" or "agent",
    "reasoning": "why you chose this mode",
    "confidence": 0.0 to 1.0
}}

Return ONLY JSON."""

    try:
        decision = llm_client.call_structured(prompt, RoutingDecision)
        log.info(
            "agent_completed",
            mode=decision.mode,
            confidence=decision.confidence,
        )
        manager.broadcast_sync(task_id, {
            "type": "progress",
            "agent": "router",
            "status": "completed",
            "message": f"Routed to {decision.mode} mode"
        })
    except (ValidationError, json.JSONDecodeError) as e:
        log.error("agent_failed", error=str(e))
        decision = RoutingDecision(
            mode="agent",
            reasoning="Could not parse decision, defaulting to agent mode",
            confidence=0.5,
        )

    return {
        **state,
        "mode": decision.mode,
        "routing_reasoning": decision.reasoning,
        "total_cost": state.get("total_cost", 0) + 0.0,
    }
