from langgraph.graph import StateGraph, END
from backend.orchestration.state import TaskState
from backend.orchestration.agents.intent_interpreter import interpret_intent
from backend.orchestration.agents.router import route_task
from backend.orchestration.workflows.simple_workflow import execute_workflow
from backend.orchestration.agents.planner import plan_task
from backend.orchestration.agents.executor import execute_step
from backend.orchestration.agents.reflector import reflect_on_progress

def should_use_workflow(state: dict) -> str:
    """Conditional edge function"""
    if state.get("mode") == "workflow":
        return "workflow_execution"
    else:
        return "plan"

def should_continue_execution(state: dict) -> str:
    """Decides if agent should continue, reflect, or finish"""
    current_step = state.get("current_step", 0)
    plan = state.get("plan", {})
    total_steps = len(plan.get("steps", []))
    
    if current_step >= total_steps:
        return "evaluate"
    
    # Check if we need reflection (every 2 steps)
    if current_step > 0 and current_step % 2 == 0:
        return "reflect"
    
    return "execute"

def create_graph():
    graph = StateGraph(TaskState)
    
    # Add all nodes
    graph.add_node("interpret_intent", interpret_intent)
    graph.add_node("route", route_task)
    
    # Workflow path
    graph.add_node("workflow_execution", execute_workflow)
    
    # Agent path
    graph.add_node("plan", plan_task)
    graph.add_node("execute", execute_step)
    graph.add_node("reflect", reflect_on_progress)
    graph.add_node("evaluate", lambda state: {**state})  # Placeholder for evaluation
    
    # Define flow
    graph.set_entry_point("interpret_intent")
    graph.add_edge("interpret_intent", "route")
    
    # Conditional routing
    graph.add_conditional_edges(
        "route",
        should_use_workflow,
        {
            "workflow_execution": "workflow_execution",
            "plan": "plan"
        }
    )
    
    # Workflow path
    graph.add_edge("workflow_execution", "evaluate")
    
    # Agent path
    graph.add_edge("plan", "execute")
    
    graph.add_conditional_edges(
        "execute",
        should_continue_execution,
        {
            "execute": "execute",  # Loop back
            "reflect": "reflect",
            "evaluate": "evaluate"
        }
    )
    
    graph.add_edge("reflect", "execute")  # Continue after reflection
    graph.add_edge("evaluate", END)
    
    return graph.compile()

# Create the compiled graph
workflow = create_graph()
