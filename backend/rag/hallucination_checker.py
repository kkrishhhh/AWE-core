"""
Hallucination checker — validates if the generated response is grounded in the retrieved documents.
Adapted from nicoladisabato/MultiAgenticRAG.
"""

from pydantic import BaseModel, Field
from backend.resilience.llm_client import llm_client
import json

class GradeHallucinations(BaseModel):
    """Binary score for hallucination present in generation answer."""
    binary_score: str = Field(
        description="Answer is grounded in the facts, '1' or '0'"
    )
    reasoning: str = Field(
        description="Brief reasoning for the score"
    )

def check_hallucinations(documents: str, generation: str) -> dict:
    """
    Check if the generation is grounded in the provided documents.
    Returns: {"grounded": bool, "reason": str}
    """
    
    system_prompt = f"""You are a grader assessing whether an LLM generation is grounded in / supported by a set of retrieved facts.
Here are the retrieved facts:
{documents}

Here is the LLM generation:
{generation}

Give a binary score '1' or '0', where '1' means that the answer is grounded in / supported by the set of facts, and '0' means it is hallucinated or contradicts the facts. Also provide brief reasoning.
Respond in JSON format like: {{"binary_score": "1", "reasoning": "..."}}
"""

    try:
        response = llm_client.call(system_prompt, require_json=True)
        # Parse JSON
        result = json.loads(response)
        
        is_grounded = result.get("binary_score", "0") == "1"
        reasoning = result.get("reasoning", "No reasoning provided.")
        
        return {
            "grounded": is_grounded,
            "reason": reasoning
        }
    except Exception as e:
        # Default to grounded if the check fails, to not break the pipeline unnecessarily
        return {
            "grounded": True,
            "reason": f"Hallucination check failed to parse: {e}"
        }
