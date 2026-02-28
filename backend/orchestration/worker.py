"""
Background worker — processes tasks from the async queue.
Supports conversation context injection and saving assistant responses.
"""

import asyncio
import time
import structlog
from datetime import datetime, timezone
from typing import Dict, Any

from backend.database.connection import SessionLocal
from backend.database.models import Task, TaskStatus, ExecutionLog, Message, AgentMetric
from backend.orchestration.graph import workflow
from backend.api.connection_manager import manager

logger = structlog.get_logger()

# Global task queue
task_queue: asyncio.Queue = asyncio.Queue()


async def process_task(task_data: Dict[str, Any]):
    """Process a single task with optional conversation context."""
    task_id = task_data["task_id"]
    user_input = task_data["user_input"]
    conversation_context = task_data.get("conversation_context", "")
    conversation_id = task_data.get("conversation_id")

    log = logger.bind(trace_id=task_id, worker="async_queue")
    log.info("background_processing_started", has_context=bool(conversation_context))

    db = SessionLocal()
    start_time = time.perf_counter()

    try:
        db_task = db.query(Task).filter(Task.id == task_id).first()
        if not db_task:
            log.error("task_not_found_in_db")
            return

        db_task.status = TaskStatus.RUNNING
        db.commit()

        await manager.broadcast(task_id, {
            "type": "status",
            "status": "running",
            "message": "Task execution started",
        })

        initial_state = {
            "task_id": task_id,
            "user_input": user_input,
            "conversation_context": conversation_context,
            "interpreted_task": None,
            "mode": None,
            "routing_reasoning": None,
            "plan": None,
            "current_step": 0,
            "results": [],
            "evaluation_score": None,
            "evaluation_reasoning": None,
            "total_cost": 0.0,
            "error": None,
        }

        # Execute the LangGraph workflow
        final_state = await workflow.ainvoke(initial_state)

        duration_ms = round((time.perf_counter() - start_time) * 1000, 1)

        # Update task in database
        db_task.interpreted_task = final_state.get("interpreted_task")
        db_task.mode = final_state.get("mode")
        db_task.result = final_state.get("results")
        db_task.status = TaskStatus.COMPLETED
        db_task.total_cost = final_state.get("total_cost", 0)
        db_task.completed_at = datetime.now(timezone.utc)

        # Save execution log
        execution_log = ExecutionLog(
            task_id=task_id,
            agent_type="pipeline",
            action="full_execution",
            output_data=final_state.get("interpreted_task"),
            cost=final_state.get("total_cost", 0),
        )
        db.add(execution_log)

        # Save agent metric
        metric = AgentMetric(
            task_id=task_id,
            agent_type="pipeline",
            latency_ms=duration_ms,
            tokens_used=0,
            success=1,
        )
        db.add(metric)

        # Save assistant response to conversation if applicable
        if conversation_id:
            result_summary = _summarize_result(final_state.get("results"), user_input=user_input)
            assistant_msg = Message(
                conversation_id=conversation_id,
                role="assistant",
                content=result_summary,
                task_id=task_id,
            )
            db.add(assistant_msg)

        db.commit()

        log.info(
            "background_processing_completed",
            mode=final_state.get("mode"),
            duration_ms=duration_ms,
        )

        await manager.broadcast(task_id, {
            "type": "result",
            "status": "completed",
            "result": final_state.get("results"),
            "interpreted_task": final_state.get("interpreted_task"),
        })

    except Exception as e:
        duration_ms = round((time.perf_counter() - start_time) * 1000, 1)
        log.error("background_processing_failed", error=str(e), exc_info=True)

        try:
            db_task = db.query(Task).filter(Task.id == task_id).first()
            if db_task:
                db_task.status = TaskStatus.FAILED
                db_task.error = str(e)
                db_task.completed_at = datetime.now(timezone.utc)

                metric = AgentMetric(
                    task_id=task_id, agent_type="pipeline",
                    latency_ms=duration_ms, tokens_used=0, success=0,
                )
                db.add(metric)
                db.commit()
        except Exception as db_err:
            log.error("failed_to_update_task_status", error=str(db_err))

        try:
            await manager.broadcast(task_id, {
                "type": "error", "status": "failed", "message": str(e),
            })
        except Exception:
            pass

    finally:
        db.close()

def _summarize_result(results, user_input: str = "") -> str:
    """Create a natural language summary from task results for conversation display."""
    if not results:
        return "I completed the task but didn't generate any specific results."

    import json

    # Check if any result already has a natural language response (from conversational executor)
    for r in results:
        if isinstance(r, dict) and "response" in r:
            return r["response"]

    # For tool results, use LLM to create a natural language response
    try:
        from backend.resilience.llm_client import llm_client

        results_text = json.dumps(results, indent=2, default=str)
        prompt = f"""Convert these raw tool results into a clear, natural language response for the user.

User's original question: "{user_input}"

Raw tool results:
{results_text}

Write a concise, friendly response that directly answers the user's question.
Do NOT include any JSON, code blocks, or technical formatting.
Do NOT mention tool names, task IDs, or internal details.
Just give a clear, human-readable answer."""

        response = llm_client.call(prompt, max_tokens=500)
        return response.strip()
    except Exception as e:
        # Fallback: extract meaningful data from results
        parts = []
        for r in results:
            if isinstance(r, dict):
                if "error" in r:
                    parts.append(f"Sorry, I encountered an issue: {r['error']}")
                elif "result" in r:
                    parts.append(str(r["result"]))
                elif "response" in r:
                    parts.append(r["response"])
                else:
                    # Extract only value fields, skip IDs and metadata
                    meaningful = {k: v for k, v in r.items()
                                  if k not in ("task_id", "id", "document_id", "chunk_index")}
                    if meaningful:
                        parts.append(", ".join(f"{k}: {v}" for k, v in meaningful.items()))
            else:
                parts.append(str(r))
        return "\n".join(parts) if parts else "Task completed successfully."



async def start_worker():
    """Continuously pulls tasks from the queue and processes them."""
    logger.info("async_worker_started")
    while True:
        try:
            task_data = await task_queue.get()
            try:
                await process_task(task_data)
            finally:
                task_queue.task_done()
        except Exception as e:
            logger.error("worker_loop_error", error=str(e))
