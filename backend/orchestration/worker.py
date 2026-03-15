"""
Background worker — processes tasks from the async queue.
Supports conversation context injection and saving assistant responses.
Fast-path for conversational messages (1 LLM call instead of 5).
"""

import asyncio
import re
import time
import structlog
from datetime import datetime, timezone
from typing import Dict, Any
from langchain_core.messages import HumanMessage

from backend.database.connection import SessionLocal
from backend.database.models import Task, TaskStatus, ExecutionLog, Message, AgentMetric
from backend.orchestration.graph import workflow
from backend.api.connection_manager import manager
from backend.resilience.llm_client import llm_client

logger = structlog.get_logger()

# Global task queue
task_queue: asyncio.Queue = asyncio.Queue()

# ── Fast-path detection ──────────────────────────────────────
_GREETING_PATTERNS = re.compile(
    r"^(hi|hey|hello|yo|sup|hola|howdy|hii+|heyy+|good\s*(morning|evening|afternoon|night)|"
    r"what'?s?\s*up|how\s*are\s*you|how\s*do\s*you\s*do|thanks|thank\s*you|bye|goodbye|"
    r"ok|okay|sure|cool|nice|great|awesome|wow|lol|haha|hmm+|bruh|bro|dude|"
    r"who\s*are\s*you|what\s*are\s*you|what\s*can\s*you\s*do|help|"
    r"tell\s*me\s*(about\s*yourself|a\s*joke|something\s*interesting)|"
    r"good\s*bot|bad\s*bot|test|testing|asdf+|qwerty|abc|xyz|"
    r"[a-z]{1,5}|[^a-zA-Z0-9\s]{1,10})$",
    re.IGNORECASE,
)

# Keywords that indicate a TOOL is needed (skip fast-path)
_TOOL_KEYWORDS = [
    "calculate", "compute", "math", "add", "subtract", "multiply", "divide", "sum", "sqrt",
    "weather", "temperature", "forecast", "climate",
    "summarize", "summary", "condense", "shorten", "brief",
    "sentiment", "emotion", "feeling", "tone", "opinion", "analyze sentiment",
    "execute", "run code", "python", "code", "program",
    "analyze", "data", "statistics", "mean", "median", "average", "outlier",
    "scrape", "fetch", "url", "website", "http", "www",
    "json", "transform", "query", "parse",
    "search", "knowledge", "document", "pdf", "uploaded",
    "aqi", "air quality",
]


def _is_conversational(text: str) -> bool:
    """Detect if a message is conversational (no tool needed)."""
    stripped = text.strip()
    # Very short messages (< 4 words) without tool keywords are conversational
    words = stripped.split()
    if len(words) <= 3:
        lower = stripped.lower().strip("!?.,:;")
        # Check if it matches greeting patterns
        if _GREETING_PATTERNS.match(lower):
            return True
    # Check for tool keywords — if any present, NOT conversational
    lower_text = stripped.lower()
    for kw in _TOOL_KEYWORDS:
        if kw in lower_text:
            return False
    # Short messages without tool keywords are conversational
    if len(words) <= 5:
        return True
    return False


async def _fast_conversational_response(task_id: str, user_input: str, conversation_context: str) -> str:
    """Generate a quick conversational response with 1 LLM call."""
    # Broadcast all pipeline stages as completed instantly
    for agent in ["intent_interpreter", "router", "planner", "executor", "reflector"]:
        await manager.broadcast(task_id, {
            "type": "progress",
            "agent": agent,
            "status": "completed",
            "message": f"{agent.replace('_', ' ').title()} complete",
        })

    context_block = ""
    if conversation_context:
        context_block = f"\nPrevious conversation:\n{conversation_context}\n"

    prompt = f"""You are a friendly AI assistant for the Agentic Workflow Engine.
{context_block}
User: {user_input}

Respond naturally and conversationally. If the user is just greeting you, greet them back warmly.
If they ask what you can do, briefly mention your capabilities: calculating math, checking weather,
summarizing text, analyzing sentiment, running Python code, analyzing data, scraping websites,
transforming JSON, and searching uploaded documents (knowledge base).
Keep it concise and friendly. Do NOT start with "I'm just an AI" disclaimers."""

    try:
        return await _stream_llm_response(prompt, task_id)
    except Exception:
        return "Hey! 👋 I'm here to help. I can calculate, check weather, summarize text, analyze data, run code, and much more. What would you like to do?"

async def _stream_llm_response(prompt: str, task_id: str) -> str:
    """Stream LLM tokens over WebSocket while building the final string."""
    try:
        # We access the underlying Groq client directly to pass stream=True
        completion = llm_client.client.chat.completions.create(
            model=llm_client.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=llm_client.temperature,
            stream=True
        )
        full_text = ""
        for chunk in completion:
            token = chunk.choices[0].delta.content or ""
            if token:
                full_text += token
                # Broadcast the raw token to the frontend
                await manager.broadcast(task_id, {
                    "type": "token",
                    "token": token
                })
        return full_text.strip()
    except Exception as e:
        logger.error("stream_failed", error=str(e))
        # Provide a fallback if streaming fails
        fallback = llm_client.call(prompt, max_tokens=250)
        await manager.broadcast(task_id, {"type": "token", "token": fallback})
        return fallback.strip()


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

        # ══════════════════════════════════════════════
        # FAST-PATH: Conversational messages (1 LLM call)
        # ══════════════════════════════════════════════
        if _is_conversational(user_input):
            log.info("fast_path_conversational", input=user_input[:50])
            response = await _fast_conversational_response(task_id, user_input, conversation_context)
            duration_ms = round((time.perf_counter() - start_time) * 1000, 1)

            db_task.status = TaskStatus.COMPLETED
            db_task.result = [{"response": response}]
            db_task.mode = "conversational"
            db_task.completed_at = datetime.now(timezone.utc)

            metric = AgentMetric(
                task_id=task_id, agent_type="fast_path",
                latency_ms=duration_ms, tokens_used=0, success=1,
            )
            db.add(metric)

            if conversation_id:
                assistant_msg = Message(
                    conversation_id=conversation_id,
                    role="assistant",
                    content=response,
                    task_id=task_id,
                )
                db.add(assistant_msg)

            db.commit()
            log.info("fast_path_completed", duration_ms=duration_ms)

            await manager.broadcast(task_id, {
                "type": "result",
                "status": "completed",
                "result": [{"response": response}],
            })
            return

        # ══════════════════════════════════════════════
        # FULL PIPELINE: Tool-based tasks
        # ══════════════════════════════════════════════
        initial_state = {
            "task_id": task_id,
            "user_input": user_input,
            "messages": [HumanMessage(content=user_input)],
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

        # Execute the LangGraph workflow with native MemorySaver
        config = {"configurable": {"thread_id": conversation_id or task_id}}
        final_state = await workflow.ainvoke(initial_state, config=config)

        duration_ms = round((time.perf_counter() - start_time) * 1000, 1)

        # Check for plan rejection
        error_msg = final_state.get("error", "")
        if error_msg and "rejected" in str(error_msg).lower():
            log.info("plan_rejected_by_user")
            rejection_response = "No problem! I've cancelled that plan. Feel free to rephrase your request or try something different. 👍"

            db_task.status = TaskStatus.COMPLETED  # Not FAILED
            db_task.result = [{"response": rejection_response}]
            db_task.mode = final_state.get("mode")
            db_task.completed_at = datetime.now(timezone.utc)

            if conversation_id:
                assistant_msg = Message(
                    conversation_id=conversation_id,
                    role="assistant",
                    content=rejection_response,
                    task_id=task_id,
                )
                db.add(assistant_msg)

            db.commit()

            await manager.broadcast(task_id, {
                "type": "result",
                "status": "completed",
                "result": [{"response": rejection_response}],
            })
            return

        # Broadcast ALL agent steps as completed
        for agent_name in ["intent_interpreter", "router", "planner", "executor", "reflector"]:
            await manager.broadcast(task_id, {
                "type": "progress",
                "agent": agent_name,
                "status": "completed",
                "message": f"{agent_name.replace('_', ' ').title()} complete",
            })

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

        # Generate final summary (and stream it to user if RAG)
        result_summary = await _summarize_result(final_state.get("results"), task_id, user_input=user_input)

        # Save assistant response to conversation
        if conversation_id:
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

        # Ensure the frontend gets the synthesized answer
        final_results = final_state.get("results", [])
        if final_results and isinstance(final_results[-1], dict):
            final_results[-1]["answer"] = result_summary

        await manager.broadcast(task_id, {
            "type": "result",
            "status": "completed",
            "result": final_results,
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


async def _summarize_result(results, task_id: str, user_input: str = "") -> str:
    """Create a natural language summary from task results for conversation display."""
    if not results:
        return "I completed the task but didn't generate any specific results."

    import json

    # Check if any result already has a natural language response
    for r in results:
        if isinstance(r, dict) and "response" in r:
            return r["response"]

    # Fast-path: format simple tool results WITHOUT calling LLM
    for r in results:
        if isinstance(r, dict):
            # Calculator result
            if "result" in r and "expression" in r:
                return f"The result of {r['expression']} is **{r['result']}**."
            # Weather result
            if "temperature" in r and "city" in r:
                parts = [f"Weather in **{r['city']}**: {r.get('temperature', '?')}°C"]
                if r.get("conditions"):
                    parts.append(f"Conditions: {r['conditions']}")
                if r.get("humidity"):
                    parts.append(f"Humidity: {r['humidity']}%")
                if r.get("wind_speed"):
                    parts.append(f"Wind: {r['wind_speed']} km/h")
                return ". ".join(parts) + "."
            # Sentiment analysis result
            if "sentiment" in r:
                conf = f" (confidence: {r['confidence']})" if "confidence" in r else ""
                return f"Sentiment: **{r['sentiment']}**{conf}"
            # Summary result
            if "summary" in r:
                return r["summary"]
            # Code execution result
            if "output" in r and ("code" in r or "executed" in str(r).lower()):
                return f"**Code Output:**\n```\n{r['output']}\n```"
            # Data analysis result
            if "statistics" in r or "mean" in r:
                parts = []
                for k, v in r.items():
                    if k not in ("task_id", "id"):
                        parts.append(f"**{k}**: {v}")
                return "\n".join(parts)
            # Knowledge retrieval - Stream the RAG synthesis answer!
            if "documents" in r or "chunks" in r or "matches" in r:
                if "answer" in r:
                    return r["answer"]
                if "context" in r:
                    prompt = f"You are a helpful AI assistant. Answer the user's prompt using ONLY the following context retrieved from their knowledge base.\n\nContext:\n{r['context']}\n\nUser Prompt: {user_input}"
                    return await _stream_llm_response(prompt, task_id)

    # Multi-result: combine multiple tool outputs into a report
    if len(results) > 1:
        parts = []
        for i, r in enumerate(results):
            if isinstance(r, dict):
                if "error" in r:
                    parts.append(f"**Step {i+1}:** ⚠️ {r['error']}")
                elif "response" in r:
                    parts.append(f"**Step {i+1}:** {r['response']}")
                elif "summary" in r:
                    parts.append(f"**Step {i+1} — Summary:** {r['summary']}")
                elif "sentiment" in r:
                    parts.append(f"**Step {i+1} — Sentiment:** {r['sentiment']}")
                elif "result" in r:
                    parts.append(f"**Step {i+1}:** {r['result']}")
                else:
                    meaningful = {k: v for k, v in r.items()
                                  if k not in ("task_id", "id", "document_id")}
                    if meaningful:
                        parts.append(f"**Step {i+1}:** " + ", ".join(f"{k}: {v}" for k, v in meaningful.items()))
            else:
                parts.append(f"**Step {i+1}:** {r}")
        if parts:
            return "\n\n".join(parts)

    # Single result fallback
    for r in results:
        if isinstance(r, dict):
            if "error" in r:
                return f"Sorry, I encountered an issue: {r['error']}"
            elif "result" in r:
                return str(r["result"])
            elif "message" in r and "available_tools" in r:
                # "No matching tools" — this should never reach the user now, but just in case
                return ("I couldn't find the right tool for that request. "
                        "I can help with: calculations, weather, text summaries, sentiment analysis, "
                        "running Python code, data analysis, web scraping, JSON transforms, "
                        "and searching your uploaded documents. Try rephrasing your request!")
            else:
                meaningful = {k: v for k, v in r.items()
                              if k not in ("task_id", "id", "document_id", "chunk_index")}
                if meaningful:
                    return ", ".join(f"{k}: {v}" for k, v in meaningful.items())
        else:
            return str(r)

    return "Task completed successfully."


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
