"""
Typed API response models for all endpoints.
Ensures every response is documented, validated, and OpenAPI-spec compliant.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime


# ── Task Endpoints ────────────────────────────────────────

class TaskCreateRequest(BaseModel):
    """Input for creating a new task."""
    task_description: str = Field(..., min_length=1, max_length=5000, description="The user's task description")


class TaskCreateResponse(BaseModel):
    """Response after queuing a new task."""
    task_id: str
    status: str
    message: str


class TaskDetailResponse(BaseModel):
    """Full detail response for a single task."""
    task_id: str
    status: str
    user_input: str
    interpreted_task: Optional[dict] = None
    mode: Optional[str] = None
    result: Optional[Any] = None
    error: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    total_cost: float = 0.0


class TaskSummaryResponse(BaseModel):
    """Lightweight task for list views."""
    task_id: str
    status: str
    user_input: str
    created_at: datetime
    completed_at: Optional[datetime] = None


class PaginatedTasksResponse(BaseModel):
    """Paginated list of tasks."""
    tasks: List[TaskSummaryResponse]
    total: int
    offset: int
    limit: int
    has_more: bool


# ── Execution Logs ────────────────────────────────────────

class ExecutionLogResponse(BaseModel):
    """Single execution log entry."""
    agent_type: Optional[str] = None
    action: Optional[str] = None
    timestamp: datetime
    tokens_used: Optional[int] = None
    cost: Optional[float] = None


class TaskLogsResponse(BaseModel):
    """All logs for a specific task."""
    task_id: str
    logs: List[ExecutionLogResponse]


# ── Health Check ──────────────────────────────────────────

class HealthCheckResponse(BaseModel):
    """Deep health check response."""
    status: str
    environment: str
    version: str
    uptime_seconds: float
    database: str
    queue_depth: int
    tools_registered: int


# ── Error ─────────────────────────────────────────────────

class ErrorDetail(BaseModel):
    code: Any
    message: str
    trace_id: str


class ErrorResponse(BaseModel):
    error: ErrorDetail
