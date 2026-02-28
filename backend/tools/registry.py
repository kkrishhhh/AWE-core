import importlib
import pkgutil
from pathlib import Path
import structlog

from .base import BaseTool

logger = structlog.get_logger()


class ToolNotFoundError(Exception):
    """Raised when a tool is not found in the registry."""
    pass


class ToolRegistry:
    """
    Central registry for all tools. Supports auto-discovery from the tools package.

    Usage:
        ToolRegistry.auto_discover()       # Scans backend/tools/ and registers all BaseTool subclasses
        tool = ToolRegistry.get("weather_api")
        result = await tool.execute({"city": "London"})
    """

    _tools: dict[str, BaseTool] = {}

    @classmethod
    def register(cls, tool: BaseTool):
        """Register a single tool instance."""
        cls._tools[tool.name] = tool
        logger.info("tool_registered", tool_name=tool.name)

    @classmethod
    def auto_discover(cls):
        """Auto-discover and register all BaseTool subclasses in the tools package."""
        tools_path = Path(__file__).parent

        for module_info in pkgutil.iter_modules([str(tools_path)]):
            if module_info.name not in ("base", "registry", "__init__", "__pycache__"):
                try:
                    importlib.import_module(f"backend.tools.{module_info.name}")
                except Exception as e:
                    logger.warning(
                        "tool_discovery_failed",
                        module=module_info.name,
                        error=str(e),
                    )

        # Register all discovered BaseTool subclasses
        for tool_cls in BaseTool.__subclasses__():
            if tool_cls.name not in cls._tools:
                cls.register(tool_cls())

        logger.info("tool_discovery_complete", total_tools=len(cls._tools))

    @classmethod
    def get(cls, name: str) -> BaseTool:
        """Get a tool by name. Raises ToolNotFoundError if not found."""
        if name not in cls._tools:
            raise ToolNotFoundError(
                f"Tool '{name}' not found. Available: {list(cls._tools.keys())}"
            )
        return cls._tools[name]

    @classmethod
    def list_tools(cls) -> list[dict]:
        """Return metadata for all registered tools (useful for LLM prompts)."""
        return [
            {
                "name": t.name,
                "description": t.description,
                "schema": t.get_schema(),
            }
            for t in cls._tools.values()
        ]
