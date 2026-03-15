"""
Planner Agent — Creates step-by-step execution plans.
Supports Human-in-the-Loop approval for complex plans.
"""

import json
import asyncio
import structlog
from pydantic import ValidationError

from backend.resilience.llm_client import llm_client
from backend.schemas.agent_schemas import ExecutionPlan
from backend.tools.registry import ToolRegistry
from backend.api.connection_manager import manager

logger = structlog.get_logger()


async def plan_task(state: dict) -> dict:
    """
    Creates a step-by-step plan using dynamically discovered tools.
    For complex plans (3+ steps), requests human approval via WebSocket.
    """
    interpreted = state["interpreted_task"]
    task_id = state.get("task_id", "unknown")
    log = logger.bind(trace_id=task_id, agent="planner")

    log.info("agent_started", goal=interpreted.get("primary_goal", "unknown")[:80])

    manager.broadcast_sync(task_id, {
        "type": "progress",
        "agent": "planner",
        "status": "running",
        "message": "Generating execution plan...",
    })

    available_tools = ToolRegistry.list_tools()

    prompt = f"""You are a planning agent for an AI workflow engine.

Task to accomplish:
{json.dumps(interpreted, indent=2)}

Available tools:
{json.dumps(available_tools, indent=2)}

Create a step-by-step plan. IMPORTANT RULES:
1. If the user is just chatting (greetings, questions about you, general conversation), create ONE step with tool_needed="none".
2. For tasks needing MULTIPLE tools, chain them so each step's output feeds into the next.
   Example: "Scrape a website and summarize it" → Step 1: web_scraper, Step 2: text_summarizer (uses scraped text)
3. For simple single-tool tasks (e.g. "calculate 2+2"), create just ONE step.
4. Only use tool names from the available tools list above, or "none" for conversational responses.

Return JSON:
{{
    "steps": [
        {{
            "step_number": 1,
            "description": "what to do (be specific about data flow from previous steps)",
            "tool_needed": "tool_name or none",
            "expected_output": "what we expect to get"
        }}
    ],
    "estimated_complexity": "low|medium|high"
}}

Return ONLY JSON."""

    try:
        plan = llm_client.call_structured(prompt, ExecutionPlan)
        log.info(
            "agent_completed",
            num_steps=len(plan.steps),
            complexity=plan.estimated_complexity,
        )

        manager.broadcast_sync(task_id, {
            "type": "progress",
            "agent": "planner",
            "status": "completed",
            "message": f"Created {len(plan.steps)}-step plan",
        })

        plan_data = plan.model_dump()

        # ── Human-in-the-Loop for complex multi-step plans (4+ steps) ──
        if len(plan.steps) >= 4:
            log.info("requesting_human_approval", steps=len(plan.steps))

            manager.request_approval_sync(task_id, plan_data)

            # Wait for user approval (auto-approve after 30s if no response)
            try:
                approval = await manager.wait_for_approval(task_id, timeout=30)

                if not approval.get("approved", True):
                    log.info("plan_rejected", feedback=approval.get("feedback", ""))
                    manager.broadcast_sync(task_id, {
                        "type": "progress",
                        "agent": "planner",
                        "status": "rejected",
                        "message": f"Plan rejected: {approval.get('feedback', 'No feedback')}",
                    })
                    return {
                        **state,
                        "plan": plan_data,
                        "error": f"Plan rejected by user: {approval.get('feedback', '')}",
                    }

                log.info("plan_approved")
                manager.broadcast_sync(task_id, {
                    "type": "progress",
                    "agent": "planner",
                    "status": "approved",
                    "message": "Plan approved by user — proceeding",
                })

            except Exception as e:
                log.warning("approval_timeout_auto_approve", error=str(e))
                # Auto-approve on timeout — never leave the user hanging
                manager.broadcast_sync(task_id, {
                    "type": "progress",
                    "agent": "planner",
                    "status": "approved",
                    "message": "Plan auto-approved (no response within 30s)",
                })

    except (ValidationError, json.JSONDecodeError) as e:
        log.error("agent_failed", error=str(e))
        plan_data = ExecutionPlan(
            steps=[
                {
                    "step_number": 1,
                    "description": f"Execute task: {interpreted.get('primary_goal', 'unknown')}",
                    "tool_needed": "calculator",
                    "expected_output": "Task completion",
                }
            ],
            estimated_complexity="medium",
        ).model_dump()

    return {
        **state,
        "plan": plan_data,
        "current_step": 0,
        "total_cost": state.get("total_cost", 0) + 0.0,
    }
