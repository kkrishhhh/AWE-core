"""
Agentic Workflow Engine — FastAPI Application

Production-grade AI agent orchestration with:
- Multi-turn conversational interface
- RAG document ingestion and retrieval
- Human-in-the-loop plan approval
- Real-time WebSocket streaming
- Agent evaluation analytics
- Modern lifespan with graceful shutdown
"""

import time
import json
import asyncio
import structlog
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from pydantic import BaseModel, Field
from typing import Optional
import uuid

from backend.config import settings
from backend.database.connection import get_db, init_db, engine
from backend.database.models import (
    Task, TaskStatus, ExecutionLog, Conversation, Message, AgentMetric,
)
from backend.observability.logger import configure_logging
from backend.tools.registry import ToolRegistry
from backend.orchestration.worker import task_queue, start_worker
from backend.api.connection_manager import manager
from backend.api.middleware import RequestContextMiddleware, http_exception_handler
from backend.schemas.api_schemas import (
    TaskCreateResponse,
    TaskDetailResponse,
    TaskSummaryResponse,
    PaginatedTasksResponse,
    TaskLogsResponse,
    ExecutionLogResponse,
    HealthCheckResponse,
    ErrorResponse,
)

# ── Logging ──
configure_logging()
logger = structlog.get_logger()

_startup_time: float = 0
_background_tasks: list[asyncio.Task] = []


# ── Request Models ────────────────────────────────────────

class ConversationMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)

class DocumentIngestRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Document text to ingest")
    source: str = Field(default="user_upload", description="Source identifier")
    metadata: Optional[dict] = None

class TaskCreateRequest(BaseModel):
    task_description: str = Field(..., min_length=1, max_length=5000)
    conversation_id: Optional[str] = None

class ApprovalRequest(BaseModel):
    approved: bool
    feedback: str = ""


# ── Lifespan ──────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _startup_time

    init_db()
    ToolRegistry.auto_discover()
    _startup_time = time.time()

    worker_task = asyncio.create_task(start_worker(), name="background_worker")
    queue_task = asyncio.create_task(manager.process_queue(), name="ws_queue_processor")
    _background_tasks.extend([worker_task, queue_task])

    logger.info(
        "application_started",
        version="3.0",
        environment=settings.ENVIRONMENT,
        tools_registered=len(ToolRegistry.list_tools()),
    )

    yield

    logger.info("application_shutting_down")
    for task in _background_tasks:
        task.cancel()
        try:
            await asyncio.wait_for(task, timeout=5.0)
        except (asyncio.CancelledError, asyncio.TimeoutError):
            pass
    engine.dispose()
    logger.info("application_shutdown_complete")


# ── App ───────────────────────────────────────────────────

app = FastAPI(
    title="Agentic Workflow Engine",
    version="3.0",
    description="AI agent orchestration with RAG, memory, human-in-the-loop, and real-time streaming.",
    lifespan=lifespan,
)

app.add_middleware(RequestContextMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_exception_handler(HTTPException, http_exception_handler)


# ══════════════════════════════════════════════════════════
#  CONVERSATIONS (Multi-Turn Memory)
# ══════════════════════════════════════════════════════════

@app.post("/api/conversations", status_code=201)
async def create_conversation(db: Session = Depends(get_db)):
    """Start a new multi-turn conversation session."""
    conv_id = str(uuid.uuid4())
    conv = Conversation(id=conv_id)
    db.add(conv)
    db.commit()
    return {"conversation_id": conv_id, "created_at": conv.created_at.isoformat()}


@app.get("/api/conversations/{conversation_id}")
async def get_conversation(conversation_id: str, db: Session = Depends(get_db)):
    """Get full conversation history with all messages and task results."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).order_by(Message.timestamp).all()

    return {
        "conversation_id": conv.id,
        "title": conv.title,
        "created_at": conv.created_at.isoformat(),
        "messages": [
            {
                "role": m.role,
                "content": m.content,
                "task_id": m.task_id,
                "timestamp": m.timestamp.isoformat(),
            }
            for m in messages
        ],
    }


@app.post("/api/conversations/{conversation_id}/messages", status_code=202)
async def send_message(
    conversation_id: str,
    req: ConversationMessageRequest,
    db: Session = Depends(get_db),
):
    """Send a message in a conversation — triggers agent execution with full context."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Save user message
    user_msg = Message(
        conversation_id=conversation_id,
        role="user",
        content=req.message,
    )
    db.add(user_msg)

    # Auto-set title from first message
    if not conv.title:
        conv.title = req.message[:100]

    # Build conversation context from previous messages
    prev_messages = db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).order_by(Message.timestamp).all()

    context = []
    for m in prev_messages[-10:]:  # Last 10 messages for context
        context.append(f"{m.role}: {m.content}")

    # Create task linked to this conversation
    task_id = str(uuid.uuid4())
    new_task = Task(
        id=task_id,
        conversation_id=conversation_id,
        user_input=req.message,
        status=TaskStatus.PENDING,
    )
    db.add(new_task)
    user_msg.task_id = task_id
    db.commit()

    # Queue task with conversation context
    await task_queue.put({
        "task_id": task_id,
        "user_input": req.message,
        "conversation_context": "\n".join(context),
        "conversation_id": conversation_id,
    })

    return {
        "task_id": task_id,
        "conversation_id": conversation_id,
        "status": "pending",
        "message": "Message received, processing with context",
    }


@app.get("/api/conversations")
async def list_conversations(
    offset: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """List all conversations with pagination."""
    total = db.query(Conversation).count()
    convs = db.query(Conversation).order_by(
        Conversation.created_at.desc()
    ).offset(offset).limit(limit).all()

    return {
        "conversations": [
            {
                "id": c.id,
                "title": c.title or "Untitled",
                "created_at": c.created_at.isoformat(),
            }
            for c in convs
        ],
        "total": total,
        "offset": offset,
        "limit": limit,
    }


# ══════════════════════════════════════════════════════════
#  TASKS
# ══════════════════════════════════════════════════════════

@app.post("/api/tasks", response_model=TaskCreateResponse, status_code=202)
async def create_task(task_input: TaskCreateRequest, db: Session = Depends(get_db)):
    """Create a standalone task (no conversation context)."""
    task_id = str(uuid.uuid4())

    new_task = Task(
        id=task_id,
        user_input=task_input.task_description,
        conversation_id=task_input.conversation_id,
        status=TaskStatus.PENDING,
    )
    db.add(new_task)
    db.commit()

    await task_queue.put({
        "task_id": task_id,
        "user_input": task_input.task_description,
    })

    return TaskCreateResponse(
        task_id=task_id,
        status="pending",
        message="Task queued for execution",
    )


@app.get("/api/tasks", response_model=PaginatedTasksResponse)
async def list_tasks(
    offset: int = 0,
    limit: int = 20,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    """List tasks with pagination and optional status filter."""
    query = db.query(Task)
    if status:
        try:
            query = query.filter(Task.status == TaskStatus(status))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

    total = query.count()
    tasks = query.order_by(Task.created_at.desc()).offset(offset).limit(limit).all()

    return PaginatedTasksResponse(
        tasks=[
            TaskSummaryResponse(
                task_id=t.id, status=t.status.value, user_input=t.user_input[:200],
                created_at=t.created_at, completed_at=t.completed_at,
            )
            for t in tasks
        ],
        total=total, offset=offset, limit=limit, has_more=(offset + limit) < total,
    )


@app.get("/api/tasks/{task_id}", response_model=TaskDetailResponse)
async def get_task(task_id: str, db: Session = Depends(get_db)):
    """Get full task details."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    return TaskDetailResponse(
        task_id=task.id, status=task.status.value, user_input=task.user_input,
        interpreted_task=task.interpreted_task, mode=task.mode,
        result=task.result, error=task.error,
        created_at=task.created_at, completed_at=task.completed_at, total_cost=task.total_cost,
    )


@app.get("/api/tasks/{task_id}/logs", response_model=TaskLogsResponse)
async def get_task_logs(task_id: str, db: Session = Depends(get_db)):
    """Get execution logs for a task."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    logs = db.query(ExecutionLog).filter(ExecutionLog.task_id == task_id).all()
    return TaskLogsResponse(
        task_id=task_id,
        logs=[
            ExecutionLogResponse(
                agent_type=l.agent_type, action=l.action, timestamp=l.timestamp,
                tokens_used=l.tokens_used, cost=l.cost,
            )
            for l in logs
        ],
    )


# ══════════════════════════════════════════════════════════
#  DOCUMENTS (RAG)
# ══════════════════════════════════════════════════════════

@app.post("/api/documents", status_code=201)
async def ingest_document(req: DocumentIngestRequest):
    """Ingest a document into the RAG vector store for knowledge retrieval."""
    from backend.rag.vector_store import vector_store

    result = vector_store.ingest(
        text=req.text,
        source=req.source,
        metadata=req.metadata,
    )
    return result


@app.post("/api/documents/upload", status_code=201)
async def ingest_upload(file: UploadFile = File(...), source: str = Form(None)):
    """Extract text from various file formats and ingest into RAG."""
    try:
        from fastapi.concurrency import run_in_threadpool
        from backend.rag.document_loader import document_loader
        from backend.rag.vector_store import vector_store

        file_bytes = await file.read()
        filename = file.filename or "unknown"
        
        # Offload the CPU-bound parsing to a thread
        def parse_file():
            return document_loader.load(file_bytes, filename)
            
        text = await run_in_threadpool(parse_file)

        if len(text.strip()) < 10:
            raise HTTPException(status_code=400, detail="Could not extract enough text from this file.")

        # Truncate very large files to prevent ChromaDB slowness
        if len(text) > 100000:
            text = text[:100000]

        doc_source = source or filename

        # Offload ChromaDB ingestion to a thread too
        def do_ingest():
            return vector_store.ingest(
                text=text,
                source=doc_source,
                metadata={"file_name": filename, "original_size": len(file_bytes)},
                chunk_size=1000,
                chunk_overlap=150
            )
            
        result = await run_in_threadpool(do_ingest)
        return result
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        logger.error("file_extraction_failed", error=str(e), filename=getattr(file, "filename", "unknown"))
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")


@app.get("/api/documents")
async def list_documents():
    """List all documents in the RAG knowledge base."""
    from backend.rag.vector_store import vector_store

    docs = vector_store.list_documents()
    stats = vector_store.get_stats()
    return {
        "documents": docs,
        **stats,
    }


@app.delete("/api/documents/{document_id}")
async def delete_document(document_id: str):
    """Delete a document and all its chunks from the knowledge base."""
    from backend.rag.vector_store import vector_store

    result = vector_store.delete_document(document_id)
    if result["deleted"] == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return result


# ══════════════════════════════════════════════════════════
#  TOOLS
# ══════════════════════════════════════════════════════════

@app.get("/api/tools")
async def list_tools():
    """List all registered tools with schemas."""
    tools = ToolRegistry.list_tools()
    return {"tools": tools, "count": len(tools)}


# ══════════════════════════════════════════════════════════
#  HUMAN-IN-THE-LOOP
# ══════════════════════════════════════════════════════════

@app.post("/api/tasks/{task_id}/approve")
async def approve_task(task_id: str, req: ApprovalRequest):
    """Approve or reject a pending execution plan."""
    await manager.submit_approval(task_id, req.approved, req.feedback)
    return {
        "task_id": task_id,
        "approved": req.approved,
        "message": "Plan approved" if req.approved else "Plan rejected",
    }


# ══════════════════════════════════════════════════════════
#  WEBSOCKET
# ══════════════════════════════════════════════════════════

@app.websocket("/api/ws/tasks/{task_id}")
async def websocket_endpoint(websocket: WebSocket, task_id: str):
    """Real-time streaming + HITL approval via WebSocket."""
    await manager.connect(websocket, task_id)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                # Handle approval responses from frontend
                if msg.get("type") == "approval_response":
                    await manager.submit_approval(
                        task_id,
                        msg.get("approved", True),
                        msg.get("feedback", ""),
                    )
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket, task_id)
    except Exception as e:
        logger.error("websocket_error", error=str(e))
        manager.disconnect(websocket, task_id)


# ══════════════════════════════════════════════════════════
#  ANALYTICS (Agent Evaluation)
# ══════════════════════════════════════════════════════════

@app.get("/api/analytics")
async def get_analytics(db: Session = Depends(get_db)):
    """Agent evaluation dashboard — performance metrics per agent type."""
    try:
        metrics = db.query(
            AgentMetric.agent_type,
            func.count(AgentMetric.id).label("total_calls"),
            func.avg(AgentMetric.latency_ms).label("avg_latency_ms"),
            func.sum(AgentMetric.tokens_used).label("total_tokens"),
            func.avg(AgentMetric.success).label("success_rate"),
        ).group_by(AgentMetric.agent_type).all()
    except Exception:
        metrics = []

    total_tasks = db.query(Task).count()
    completed_tasks = db.query(Task).filter(Task.status == TaskStatus.COMPLETED).count()
    failed_tasks = db.query(Task).filter(Task.status == TaskStatus.FAILED).count()

    return {
        "overview": {
            "total_tasks": total_tasks,
            "completed": completed_tasks,
            "failed": failed_tasks,
            "success_rate": round(completed_tasks / max(total_tasks, 1), 3),
        },
        "agents": [
            {
                "agent_type": m[0],
                "total_calls": m[1] or 0,
                "avg_latency_ms": round(float(m[2] or 0), 1),
                "total_tokens": int(m[3] or 0),
                "success_rate": round(float(m[4] or 0), 3),
            }
            for m in metrics
        ],
    }


# ══════════════════════════════════════════════════════════
#  HEALTH
# ══════════════════════════════════════════════════════════

@app.get("/health", response_model=HealthCheckResponse)
async def health_check(db: Session = Depends(get_db)):
    """Deep health check."""
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "unhealthy"

    uptime = time.time() - _startup_time if _startup_time else 0

    return HealthCheckResponse(
        status="healthy" if db_status == "healthy" else "degraded",
        environment=settings.ENVIRONMENT,
        version="3.0",
        uptime_seconds=round(uptime, 1),
        database=db_status,
        queue_depth=task_queue.qsize(),
        tools_registered=len(ToolRegistry.list_tools()),
    )
