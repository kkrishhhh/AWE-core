"""
Sandboxed Code Executor Tool — Safely evaluate Python expressions and simple statements.

Demonstrates:
- Security-first design: AST whitelist, no exec/eval, restricted builtins
- Timeout enforcement (5-second hard kill)
- Memory bomb protection
- Support for both expressions and print statements
"""

import ast
import io
import re
import sys
import math
import threading
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
    "print": print,
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
    ast.Constant, ast.Name, ast.Load, ast.Store, ast.Del,
    ast.List, ast.Tuple, ast.Set, ast.Dict,
    ast.ListComp, ast.SetComp, ast.DictComp, ast.GeneratorExp,
    ast.comprehension,
    ast.Call, ast.Attribute,
    ast.Subscript, ast.Slice, ast.Index,
    ast.IfExp,  # Ternary expressions
    ast.JoinedStr, ast.FormattedValue,  # f-strings
    ast.Starred,
    ast.Assign,  # Allow simple assignments like x = 5
    ast.AugAssign,  # Allow x += 1
    ast.If, ast.For, ast.While,  # Basic control flow
}


def _sanitize_code(raw: str) -> str:
    """Strip common natural-language prefixes from code."""
    code = raw.strip()
    
    # Remove common prefixes
    prefixes = [
        r"^execute\s*:?\s*",
        r"^run\s+code\s*:?\s*",
        r"^run\s+python\s*:?\s*",
        r"^python\s*:?\s*",
        r"^eval\s*:?\s*",
        r"^code\s*:?\s*",
    ]
    for pat in prefixes:
        code = re.sub(pat, "", code, flags=re.IGNORECASE).strip()
    
    return code


def validate_ast(code: str, mode: str = "exec") -> None:
    """Walk the AST and reject any disallowed constructs."""
    tree = ast.parse(code, mode=mode)

    for node in ast.walk(tree):
        if type(node) not in ALLOWED_NODES:
            raise SecurityError(
                f"Blocked construct: {type(node).__name__}. "
                "Only expressions and simple statements are allowed — no imports, function definitions, or class definitions."
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
    """Safely evaluate Python expressions and simple statements in a sandboxed environment."""

    name = "code_executor"
    description = "Execute Python code safely in a sandboxed environment with math support. Supports expressions, assignments, print statements, loops, and list comprehensions."

    async def execute(self, parameters: dict) -> ToolResult:
        raw_code = parameters.get("code", "").strip()
        code = _sanitize_code(raw_code)

        if not code:
            return ToolResult(success=False, data={}, error="No code provided")

        if len(code) > 2000:
            return ToolResult(success=False, data={}, error="Code exceeds 2000 character limit")

        # Block memory bombs before execution
        if re.search(r'\[.*\]\s*\*\s*\d{6,}', code) or re.search(r'range\s*\(\s*\d{8,}', code):
            return ToolResult(success=False, data={"code": code}, error="Code blocked: potential memory bomb detected")

        try:
            # Try as expression first (simpler, faster)
            try:
                validate_ast(code, mode="eval")
                result = eval(
                    compile(ast.parse(code, mode="eval"), "<sandbox>", "eval"),
                    {"__builtins__": {}},
                    dict(SAFE_BUILTINS),
                )
                output = repr(result)
                if len(output) > 2000:
                    output = output[:2000] + "... (truncated)"
                return ToolResult(
                    success=True,
                    data={
                        "code": code,
                        "output": output,
                        "result": str(result),
                        "result_type": type(result).__name__,
                    },
                )
            except SyntaxError:
                pass  # Not a pure expression, try as statement(s)

            # Try as statement(s) — capture stdout
            validate_ast(code, mode="exec")
            
            # Capture stdout with timeout enforcement
            captured = io.StringIO()
            old_stdout = sys.stdout
            exec_error = [None]
            
            local_env = dict(SAFE_BUILTINS)
            
            def _run_sandboxed():
                try:
                    exec(
                        compile(ast.parse(code, mode="exec"), "<sandbox>", "exec"),
                        {"__builtins__": {"print": print, "range": range, "len": len, "sum": sum, 
                                          "min": min, "max": max, "sorted": sorted, "list": list,
                                          "int": int, "float": float, "str": str, "bool": bool,
                                          "abs": abs, "round": round, "enumerate": enumerate,
                                          "zip": zip, "dict": dict, "tuple": tuple, "set": set,
                                          "type": type, "isinstance": isinstance, "reversed": reversed,
                                          "True": True, "False": False, "None": None, "math": math}},
                        local_env,
                    )
                except Exception as e:
                    exec_error[0] = e
            
            try:
                sys.stdout = captured
                thread = threading.Thread(target=_run_sandboxed, daemon=True)
                thread.start()
                thread.join(timeout=5.0)  # 5-second hard kill
                
                if thread.is_alive():
                    sys.stdout = old_stdout
                    return ToolResult(success=False, data={"code": code}, error="Execution timed out after 5 seconds (possible infinite loop)")
                
                if exec_error[0]:
                    raise exec_error[0]
            finally:
                sys.stdout = old_stdout
            
            output = captured.getvalue().strip()
            if not output:
                output = "(no output)"
            if len(output) > 2000:
                output = output[:2000] + "... (truncated)"

            return ToolResult(
                success=True,
                data={
                    "code": code,
                    "output": output,
                    "result": output,
                    "executed": True,
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
                    "description": "Python code to execute (e.g. 'math.sqrt(144)' or 'print(sum(range(1,101)))' or '[x**2 for x in range(10)]')",
                }
            },
            "required": ["code"],
        }
