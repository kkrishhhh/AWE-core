from typing import TypedDict, Optional, List, Dict, Any, Annotated
from enum import Enum
from langchain_core.messages import AnyMessage
from langgraph.graph.message import add_messages

class ExecutionMode(Enum):
    WORKFLOW = "workflow"
    AGENT = "agent"

class TaskState(TypedDict):
    # Input
    task_id: str
    user_input: str
    messages: Annotated[list[AnyMessage], add_messages]
    
    # Intent interpretation
    interpreted_task: Optional[Dict[str, Any]]
    
    # Routing
    mode: Optional[ExecutionMode]
    routing_reasoning: Optional[str]
    
    # Execution
    plan: Optional[Dict[str, Any]]
    current_step: int
    results: List[Any]
    
    # Evaluation
    evaluation_score: Optional[float]
    evaluation_reasoning: Optional[str]
    
    # Metadata
    total_cost: float
    error: Optional[str]
