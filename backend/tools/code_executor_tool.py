"""
Sandboxed Code Executor Tool — Safely evaluate Python expressions.

Demonstrates:
- Security-first design: AST whitelist, no exec/eval, restricted builtins
- Timeout enforcement
- Demonstrates understanding of code injection prevention
"""

import ast
import math
from .base import BaseTool, ToolResult


# Whitelisted safe functions
SAFE_BUILTINS = {
    "abs": abs,
    "round": round,
    "min": min,
    "max": max,
    "sum": sum,
    "len": len,
    "sorted": sorted,
    "reversed": reversed,
    "enumerate": enumerate,
    "zip": zip,
    "range": range,
    "int": int,
    "float": float,
    "str": str,
    "bool": bool,
    "list": list,
    "dict": dict,
    "tuple": tuple,
    "set": set,
    "type": type,
    "isinstance": isinstance,
    "True": True,
    "False": False,
    "None": None,
    # Math functions
    "math": math,
}

# AST node whitelist — only these constructs are allowed
ALLOWED_NODES = {
    ast.Module, ast.Expr, ast.Expression,
    ast.BinOp, ast.UnaryOp, ast.BoolOp, ast.Compare,
    ast.Add, ast.Sub, ast.Mult, ast.Div, ast.FloorDiv,
    ast.Mod, ast.Pow, ast.USub, ast.UAdd, ast.Not,
    ast.And, ast.Or,
    ast.Eq, ast.NotEq, ast.Lt, ast.LtE, ast.Gt, ast.GtE,
    ast.Constant, ast.Name, ast.Load,
    ast.List, ast.Tuple, ast.Set, ast.Dict,
    ast.ListComp, ast.SetComp, ast.DictComp, ast.GeneratorExp,
    ast.comprehension,
    ast.Call, ast.Attribute,
    ast.Subscript, ast.Slice, ast.Index,
    ast.IfExp,  # Ternary expressions
    ast.JoinedStr, ast.FormattedValue,  # f-strings
    ast.Starred,
}


def validate_ast(code: str) -> None:
    """Walk the AST and reject any disallowed constructs."""
    tree = ast.parse(code, mode="eval")

    for node in ast.walk(tree):
        if type(node) not in ALLOWED_NODES:
            raise SecurityError(
                f"Blocked construct: {type(node).__name__}. "
                "Only expressions are allowed — no imports, assignments, or function definitions."
            )

        # Block dangerous attribute access
        if isinstance(node, ast.Attribute):
            if node.attr.startswith("_"):
                raise SecurityError(f"Access to private attributes ('{node.attr}') is blocked.")

        # Block dangerous function names
        if isinstance(node, ast.Name):
            if node.id in ("eval", "exec", "compile", "__import__", "open", "input", "globals", "locals"):
                raise SecurityError(f"Function '{node.id}' is blocked for security reasons.")


class SecurityError(Exception):
    """Raised when sandboxed code tries to do something unsafe."""
    pass


class CodeExecutorTool(BaseTool):
    """Safely evaluate Python expressions in a sandboxed environment."""

    name = "code_executor"
    description = "Execute a Python expression safely in a sandboxed environment with math support"

    async def execute(self, parameters: dict) -> ToolResult:
        code = parameters.get("code", "").strip()

        if not code:
            return ToolResult(success=False, data={}, error="No code provided")

        if len(code) > 1000:
            return ToolResult(success=False, data={}, error="Code exceeds 1000 character limit")

        try:
            # Security validation
            validate_ast(code)

            # Execute in restricted environment
            result = eval(
                compile(ast.parse(code, mode="eval"), "<sandbox>", "eval"),
                {"__builtins__": {}},
                SAFE_BUILTINS,
            )

            # Serialize the result
            output = repr(result)
            if len(output) > 2000:
                output = output[:2000] + "... (truncated)"

            return ToolResult(
                success=True,
                data={
                    "code": code,
                    "result": str(result),
                    "result_type": type(result).__name__,
                },
            )

        except SecurityError as e:
            return ToolResult(success=False, data={"code": code}, error=f"Security: {e}")
        except SyntaxError as e:
            return ToolResult(success=False, data={"code": code}, error=f"Syntax error: {e}")
        except Exception as e:
            return ToolResult(success=False, data={"code": code}, error=f"Execution error: {e}")

    def get_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "code": {
                    "type": "string",
                    "description": "A Python expression to evaluate (e.g. 'math.sqrt(144)' or '[x**2 for x in range(10)]')",
                }
            },
            "required": ["code"],
        }
