import ast
import re
import math
import operator
from .base import BaseTool, ToolResult


# Safe operators for calculator
SAFE_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
    ast.Mod: operator.mod,
    ast.FloorDiv: operator.floordiv,
}


def _sanitize_expression(raw: str) -> str:
    """Strip common natural-language wrappers and clean up the expression."""
    expr = raw.strip()
    
    # Remove common prefixes
    prefixes = [
        r"^calculate\s*:?\s*",
        r"^compute\s*:?\s*",
        r"^evaluate\s*:?\s*",
        r"^solve\s*:?\s*",
        r"^what\s+is\s+",
        r"^find\s+",
        r"^result\s+of\s+",
        r"^the\s+expression\s+is\s*:?\s*",
        r"^expression\s*:?\s*",
    ]
    for pat in prefixes:
        expr = re.sub(pat, "", expr, flags=re.IGNORECASE).strip()
    
    # Convert natural language math: "multiply X by Y" → "X * Y"
    expr = re.sub(r"multiply\s+(\S+)\s+by\s+(\S+)", r"\1 * \2", expr, flags=re.IGNORECASE)
    expr = re.sub(r"divide\s+(\S+)\s+by\s+(\S+)", r"\1 / \2", expr, flags=re.IGNORECASE)
    expr = re.sub(r"add\s+(\S+)\s+and\s+(\S+)", r"\1 + \2", expr, flags=re.IGNORECASE)
    expr = re.sub(r"subtract\s+(\S+)\s+from\s+(\S+)", r"\2 - \1", expr, flags=re.IGNORECASE)
    
    # Convert percentage expressions: "15% of 200" → "(15/100) * 200"
    expr = re.sub(r"(\d+(?:\.\d+)?)\s*%\s*of\s+(\d+(?:\.\d+)?)", r"(\1/100) * \2", expr, flags=re.IGNORECASE)
    # "20% tip on 50" → "(20/100) * 50"
    expr = re.sub(r"(\d+(?:\.\d+)?)\s*%\s*(?:tip\s+on|of|on)\s+(\d+(?:\.\d+)?)", r"(\1/100) * \2", expr, flags=re.IGNORECASE)
    # Standalone "15%" → "(15/100)"
    expr = re.sub(r"(\d+(?:\.\d+)?)\s*%", r"(\1/100)", expr)
    
    # Convert ^ to ** for power
    expr = expr.replace("^", "**")
    
    # Handle sqrt(x) → math.sqrt(x)
    expr = re.sub(r"sqrt\(", "math.sqrt(", expr, flags=re.IGNORECASE)
    
    # Remove trailing question marks or periods
    expr = expr.rstrip("?.")
    
    # AGGRESSIVE FALLBACK: If the expression still contains alphabetic words
    # (not math functions), try to extract just the math part
    cleaned = expr.strip()
    if cleaned and re.search(r'[a-zA-Z]', cleaned) and 'math.' not in cleaned:
        # Try to extract a math expression: numbers, operators, parentheses, dots
        math_match = re.search(r'([\d\s\+\-\*\/\%\(\)\.\*]{3,})', cleaned)
        if math_match:
            extracted = math_match.group(1).strip()
            if extracted and re.search(r'\d', extracted):
                expr = extracted
    
    return expr.strip()


def safe_eval(expression: str) -> float:
    """Safely evaluate a math expression using AST parsing (no eval/exec)."""
    tree = ast.parse(expression, mode="eval")

    def _eval(node):
        if isinstance(node, ast.Expression):
            return _eval(node.body)
        elif isinstance(node, ast.Constant):
            if isinstance(node.value, (int, float)):
                return node.value
            raise ValueError(f"Unsupported constant: {node.value}")
        elif isinstance(node, ast.BinOp):
            op_type = type(node.op)
            if op_type not in SAFE_OPERATORS:
                raise ValueError(f"Unsupported operator: {op_type.__name__}")
            left = _eval(node.left)
            right = _eval(node.right)
            return SAFE_OPERATORS[op_type](left, right)
        elif isinstance(node, ast.UnaryOp):
            op_type = type(node.op)
            if op_type not in SAFE_OPERATORS:
                raise ValueError(f"Unsupported operator: {op_type.__name__}")
            return SAFE_OPERATORS[op_type](_eval(node.operand))
        elif isinstance(node, ast.Call):
            # Support math.sqrt, math.pow etc
            if isinstance(node.func, ast.Attribute):
                if isinstance(node.func.value, ast.Name) and node.func.value.id == "math":
                    func = getattr(math, node.func.attr, None)
                    if func:
                        args = [_eval(a) for a in node.args]
                        return func(*args)
            raise ValueError(f"Unsupported function call")
        elif isinstance(node, ast.Name):
            if node.id == "math":
                return math  # Allow 'math' module reference
            raise ValueError(f"Unsupported name: {node.id}")
        else:
            raise ValueError(f"Unsupported expression: {type(node).__name__}")

    return _eval(tree)


class CalculatorTool(BaseTool):
    """Perform safe mathematical calculations."""

    name = "calculator"
    description = "Evaluate mathematical expressions safely (add, subtract, multiply, divide, power, modulo)"

    async def execute(self, parameters: dict) -> ToolResult:
        raw_expression = parameters.get("expression", "")
        expression = _sanitize_expression(raw_expression)

        if not expression:
            return ToolResult(success=False, data={}, error="No expression provided")

        try:
            result = safe_eval(expression)
            # Format result nicely
            if isinstance(result, float) and result == int(result):
                result = int(result)
            return ToolResult(
                success=True,
                data={"expression": expression, "result": result},
            )
        except (ValueError, ZeroDivisionError, SyntaxError) as e:
            return ToolResult(
                success=False,
                data={"expression": expression},
                error=str(e),
            )

    def get_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "expression": {
                    "type": "string",
                    "description": "Mathematical expression to evaluate, e.g. '2 + 3 * 4' or 'sqrt(144)'",
                }
            },
            "required": ["expression"],
        }
