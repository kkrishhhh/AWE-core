from abc import ABC, abstractmethod
from pydantic import BaseModel
from typing import Optional


class ToolResult(BaseModel):
    """Standard result format for all tools."""

    success: bool
    data: dict
    error: Optional[str] = None


class BaseTool(ABC):
    """
    Abstract base class for all tools.

    To create a new tool:
    1. Create a new file in backend/tools/
    2. Subclass BaseTool
    3. Set name and description as class attributes
    4. Implement execute() and get_schema()
    5. The tool will be auto-discovered by ToolRegistry
    """

    name: str
    description: str

    @abstractmethod
    async def execute(self, parameters: dict) -> ToolResult:
        """Execute the tool with given parameters."""
        ...

    @abstractmethod
    def get_schema(self) -> dict:
        """Return JSON schema describing the tool's parameters."""
        ...
