"""
JSON Transformer Tool — Query and transform structured JSON data using path expressions.

Demonstrates:
- JQ-like path navigation without external dependencies
- Recursive key search
- Data pipeline patterns (filter, map, select)
"""

import json
import re
from typing import Any
from .base import BaseTool, ToolResult


class JsonTransformerTool(BaseTool):
    """Query and transform JSON data using dot-notation path expressions."""

    name = "json_transformer"
    description = "Query, filter, and transform JSON data using path expressions (e.g. 'users[0].name', 'items[*].price')"

    def _navigate(self, data: Any, path: str) -> Any:
        """Navigate JSON using dot-notation with array support.

        Supports:
            - key.subkey           → nested access
            - items[0]             → array index
            - items[*]             → all items (wildcard)
            - items[*].name        → pluck field from all items
        """
        if not path:
            return data

        current = data
        parts = self._split_path(path)

        for part in parts:
            if current is None:
                return None

            # Handle wildcard [*]
            if part == "[*]":
                if not isinstance(current, list):
                    raise ValueError(f"Cannot apply [*] to non-array: {type(current).__name__}")
                # Remaining path after this
                remaining = ".".join(parts[parts.index(part) + 1:])
                if remaining:
                    return [self._navigate(item, remaining) for item in current]
                return current

            # Handle array index [N]
            index_match = re.match(r"\[(\d+)\]", part)
            if index_match:
                idx = int(index_match.group(1))
                if isinstance(current, list) and idx < len(current):
                    current = current[idx]
                else:
                    return None
                continue

            # Handle dot-notation key
            if isinstance(current, dict):
                current = current.get(part)
            elif isinstance(current, list):
                # Pluck from list of dicts
                current = [item.get(part) if isinstance(item, dict) else None for item in current]
            else:
                return None

        return current

    def _split_path(self, path: str) -> list[str]:
        """Split 'users[0].name' into ['users', '[0]', 'name']."""
        result = []
        for part in path.replace("[", ".[").split("."):
            if part:
                result.append(part)
        return result

    def _recursive_search(self, data: Any, key: str) -> list:
        """Find all values for a key anywhere in nested structure."""
        results = []
        if isinstance(data, dict):
            for k, v in data.items():
                if k == key:
                    results.append(v)
                results.extend(self._recursive_search(v, key))
        elif isinstance(data, list):
            for item in data:
                results.extend(self._recursive_search(item, key))
        return results

    async def execute(self, parameters: dict) -> ToolResult:
        raw_json = parameters.get("data", "")
        path = parameters.get("path", "").strip()
        operation = parameters.get("operation", "select")  # select | keys | count | search

        if not raw_json:
            return ToolResult(success=False, data={}, error="No JSON data provided")

        try:
            data = json.loads(raw_json) if isinstance(raw_json, str) else raw_json
        except json.JSONDecodeError as e:
            return ToolResult(success=False, data={}, error=f"Invalid JSON: {e}")

        try:
            if operation == "keys":
                if isinstance(data, dict):
                    result = list(data.keys())
                else:
                    result = list(range(len(data))) if isinstance(data, list) else []
                return ToolResult(success=True, data={"keys": result, "count": len(result)})

            elif operation == "count":
                target = self._navigate(data, path) if path else data
                count = len(target) if isinstance(target, (list, dict)) else 1
                return ToolResult(success=True, data={"path": path, "count": count})

            elif operation == "search":
                if not path:
                    return ToolResult(success=False, data={}, error="'path' is required for search operation (used as key name)")
                results = self._recursive_search(data, path)
                return ToolResult(success=True, data={"key": path, "matches": results, "count": len(results)})

            else:  # select
                if not path:
                    # Return structure overview
                    if isinstance(data, dict):
                        overview = {k: type(v).__name__ for k, v in data.items()}
                    elif isinstance(data, list):
                        overview = {"type": "array", "length": len(data)}
                    else:
                        overview = {"type": type(data).__name__, "value": data}
                    return ToolResult(success=True, data={"overview": overview})

                result = self._navigate(data, path)
                
                # Serialize for output
                serialized = json.dumps(result, default=str) if not isinstance(result, str) else result
                if len(serialized) > 3000:
                    serialized = serialized[:3000] + "... (truncated)"

                return ToolResult(
                    success=True,
                    data={
                        "path": path,
                        "result": result,
                        "result_type": type(result).__name__,
                    },
                )

        except Exception as e:
            return ToolResult(success=False, data={"path": path}, error=str(e))

    def get_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "data": {
                    "type": "string",
                    "description": "JSON string to query",
                },
                "path": {
                    "type": "string",
                    "description": "Dot-notation path expression (e.g. 'users[0].name', 'items[*].price')",
                },
                "operation": {
                    "type": "string",
                    "description": "Operation: 'select' (default), 'keys', 'count', 'search'",
                    "default": "select",
                },
            },
            "required": ["data"],
        }
