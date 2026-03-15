"""
Intent Interpreter Agent — Parses user input into structured task.
Supports multi-turn conversation context for follow-up queries.
"""

import json
import structlog
from pydantic import ValidationError

from backend.resilience.llm_client import llm_client
from backend.schemas.agent_schemas import InterpretedTask
from backend.api.connection_manager import manager

logger = structlog.get_logger()


async def interpret_intent(state: dict) -> dict:
    """
    Interprets user input into a structured task.
    Injects conversation context for multi-turn follow-up support.
    """
    user_input = state["user_input"]
    task_id = state.get("task_id", "unknown")
    conversation_context = state.get("conversation_context", "")
    log = logger.bind(trace_id=task_id, agent="intent_interpreter")

    log.info("agent_started", user_input=user_input[:100], has_context=bool(conversation_context))

    manager.broadcast_sync(task_id, {
        "type": "progress",
        "agent": "intent_interpreter",
        "status": "running",
        "message": "Interpreting user intent...",
    })

    # Build context-aware prompt from native messages memory
    context_block = ""
    messages = state.get("messages", [])
    if len(messages) > 1:
        # Exclude the last message which is the current user input
        history = []
        for m in messages[:-1]:
            role = getattr(m, "type", "unknown")
            if role == "human": role = "user"
            if role == "ai": role = "assistant"
            history.append(f"{role}: {m.content}")
        
        conversation_context = "\n".join(history)
        if conversation_context:
            context_block = f"""
Previous conversation context (use this to resolve references like "that", "it", "the result", etc.):
---
{conversation_context}
---

"""

    prompt = f"""You are an intent interpretation agent for an AI workflow engine.

{context_block}Your job: Convert the user's task description into a structured format.
If the user references previous context (e.g. "analyze that", "what about"), use the conversation history above.

User's task: "{user_input}"

Available tools: calculator, weather_api, text_summarizer, web_scraper, data_analyzer,
code_executor, json_transformer, sentiment_analyzer, knowledge_retrieval

Extract and return JSON with these fields:
{{
    "task_type": "data_retrieval|analysis|automation|other",
    "primary_goal": "what the user wants to accomplish",
    "entities": ["list", "of", "relevant", "entities"],
    "complexity": "simple|medium|complex",
    "requires_tools": ["list", "of", "likely", "tools", "needed"],
    "ambiguities": ["any", "unclear", "aspects"]
}}

Return ONLY the JSON, no other text."""

    try:
        interpreted = llm_client.call_structured(prompt, InterpretedTask)
        
        # --- RAG Auto-Trigger Logic ---
        rag_keywords = ["uploaded", "document", "pdf", "csv", "file", "knowledge base", "my docs"]
        if any(kw in user_input.lower() for kw in rag_keywords):
            if "knowledge_retrieval" not in interpreted.requires_tools:
                interpreted.requires_tools.insert(0, "knowledge_retrieval")
            if interpreted.task_type != "data_retrieval":
                interpreted.task_type = "data_retrieval"
        
        log.info(
            "agent_completed",
            task_type=interpreted.task_type,
            complexity=interpreted.complexity,
            tools=interpreted.requires_tools,
        )

        manager.broadcast_sync(task_id, {
            "type": "progress",
            "agent": "intent_interpreter",
            "status": "completed",
            "message": f"Identified task as: {interpreted.primary_goal}",
        })

        return {
            **state,
            "interpreted_task": interpreted.model_dump(),
            "total_cost": state.get("total_cost", 0) + 0.0,
        }
    except (ValidationError, json.JSONDecodeError) as e:
        log.error("agent_failed", error=str(e))
        fallback = InterpretedTask(
            task_type="other",
            primary_goal=user_input,
            entities=[],
            complexity="medium",
            requires_tools=[],
            ambiguities=["Could not interpret task"],
        )
        return {
            **state,
            "interpreted_task": fallback.model_dump(),
            "total_cost": state.get("total_cost", 0) + 0.0,
            "error": f"Intent interpretation fallback: {e}",
        }
