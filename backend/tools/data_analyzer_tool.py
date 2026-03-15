"""
Data Analyzer Tool — Statistical analysis on numeric datasets.

Demonstrates:
- Pure Python data processing (no pandas dependency)
- Statistical rigor: mean, median, mode, std dev, percentiles, outlier detection
- Flexible input: JSON arrays or CSV text
"""

import json
import math
import statistics
from collections import Counter
from .base import BaseTool, ToolResult


class DataAnalyzerTool(BaseTool):
    """Perform statistical analysis on numeric data."""

    name = "data_analyzer"
    description = "Analyze numeric data — computes mean, median, mode, std dev, percentiles, and detects outliers"

    def _parse_data(self, raw: str) -> list[float]:
        """Parse input as JSON array or comma/newline-separated values."""
        raw = raw.strip()
        
        # Clean up common conversational prefixes that the LLM might leave in
        if ":" in raw:
            parts = raw.split(":", 1)
            # If the part after colon seems to have numbers, use that
            if any(c.isdigit() for c in parts[1]):
                raw = parts[1].strip()
        
        # Remove any leading/trailing quotes or brackets if it's not valid JSON
        raw = raw.strip("'\"")

        # Try JSON array first
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return [float(x) for x in parsed]
        except (json.JSONDecodeError, ValueError):
            pass

        # Try comma-separated
        if "," in raw:
            return [float(x.strip()) for x in raw.split(",") if x.strip()]

        # Try newline-separated
        return [float(x.strip()) for x in raw.splitlines() if x.strip()]

    def _detect_outliers(self, data: list[float]) -> list[float]:
        """Detect outliers using IQR method."""
        if len(data) < 4:
            return []
        sorted_data = sorted(data)
        q1 = sorted_data[len(sorted_data) // 4]
        q3 = sorted_data[(3 * len(sorted_data)) // 4]
        iqr = q3 - q1
        lower = q1 - 1.5 * iqr
        upper = q3 + 1.5 * iqr
        return [x for x in data if x < lower or x > upper]

    async def execute(self, parameters: dict) -> ToolResult:
        raw_data = parameters.get("data", "")

        if not raw_data:
            return ToolResult(success=False, data={}, error="No data provided")

        try:
            data = self._parse_data(raw_data)
        except (ValueError, TypeError) as e:
            return ToolResult(success=False, data={}, error=f"Could not parse data: {e}")

        if len(data) < 2:
            return ToolResult(success=False, data={}, error="Need at least 2 data points")

        try:
            sorted_data = sorted(data)
            n = len(data)

            # Mode — handle multimodal
            freq = Counter(data)
            max_freq = max(freq.values())
            modes = [k for k, v in freq.items() if v == max_freq]

            result = {
                "count": n,
                "min": sorted_data[0],
                "max": sorted_data[-1],
                "range": sorted_data[-1] - sorted_data[0],
                "sum": sum(data),
                "mean": round(statistics.mean(data), 4),
                "median": round(statistics.median(data), 4),
                "mode": modes[0] if len(modes) == 1 else modes,
                "std_dev": round(statistics.stdev(data), 4),
                "variance": round(statistics.variance(data), 4),
                "percentile_25": round(sorted_data[n // 4], 4),
                "percentile_75": round(sorted_data[(3 * n) // 4], 4),
                "outliers": self._detect_outliers(data),
            }

            return ToolResult(success=True, data=result)

        except Exception as e:
            return ToolResult(success=False, data={}, error=str(e))

    def get_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "data": {
                    "type": "string",
                    "description": "Numeric data as JSON array (e.g. '[1,2,3,4,5]') or comma-separated values (e.g. '1,2,3,4,5')",
                }
            },
            "required": ["data"],
        }
