from .base import BaseTool, ToolResult
from backend.resilience.llm_client import llm_client


class TextSummarizerTool(BaseTool):
    """Summarize text using the LLM."""

    name = "text_summarizer"
    description = "Summarize a piece of text into a concise paragraph using AI"

    async def execute(self, parameters: dict) -> ToolResult:
        text = parameters.get("text", "")
        max_sentences = parameters.get("max_sentences", 3)

        if not text.strip():
            return ToolResult(
                success=False,
                data={},
                error="No text provided to summarize",
            )

        prompt = f"""Summarize the following text in at most {max_sentences} sentences.
Be concise and capture the key points.

Text:
{text}

Summary:"""

        try:
            summary = llm_client.call(prompt, max_tokens=300)
            return ToolResult(
                success=True,
                data={
                    "original_length": len(text),
                    "summary": summary.strip(),
                    "summary_length": len(summary.strip()),
                },
            )
        except Exception as e:
            return ToolResult(
                success=False,
                data={"original_length": len(text)},
                error=str(e),
            )

    def get_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "Text to summarize",
                },
                "max_sentences": {
                    "type": "integer",
                    "description": "Maximum number of sentences in the summary (default: 3)",
                    "default": 3,
                },
            },
            "required": ["text"],
        }
