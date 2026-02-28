from pydantic import BaseModel, Field
from typing import Literal


class InterpretedTask(BaseModel):
    """Schema for the Intent Interpreter agent output."""

    task_type: Literal["data_retrieval", "analysis", "automation", "other"]
    primary_goal: str = Field(min_length=3)
    entities: list[str] = Field(default_factory=list)
    complexity: Literal["simple", "medium", "complex"]
    requires_tools: list[str] = Field(default_factory=list)
    ambiguities: list[str] = Field(default_factory=list)


class RoutingDecision(BaseModel):
    """Schema for the Router agent output."""

    mode: Literal["workflow", "agent"]
    reasoning: str
    confidence: float = Field(ge=0.0, le=1.0)


class PlanStep(BaseModel):
    """Schema for a single step in an execution plan."""

    step_number: int
    description: str
    tool_needed: str
    expected_output: str


class ExecutionPlan(BaseModel):
    """Schema for the Planner agent output."""

    steps: list[PlanStep]
    estimated_complexity: Literal["low", "medium", "high"]


class ReflectionResult(BaseModel):
    """Schema for the Reflector agent output."""

    continue_execution: bool = Field(alias="continue", default=True)
    reasoning: str
    suggested_changes: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0, default=0.7)

    model_config = {"populate_by_name": True}
