import ast
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
}


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
        else:
            raise ValueError(f"Unsupported expression: {type(node).__name__}")

    return _eval(tree)


class CalculatorTool(BaseTool):
    """Perform safe mathematical calculations."""

    name = "calculator"
    description = "Evaluate mathematical expressions safely (add, subtract, multiply, divide, power, modulo)"

    async def execute(self, parameters: dict) -> ToolResult:
        expression = parameters.get("expression", "")

        try:
            result = safe_eval(expression)
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
                    "description": "Mathematical expression to evaluate, e.g. '2 + 3 * 4'",
                }
            },
            "required": ["expression"],
        }
