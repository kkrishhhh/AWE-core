"""
Sentiment Analyzer Tool — LLM-powered text sentiment classification.

Demonstrates:
- Structured LLM output with Pydantic validation
- Multi-label classification (sentiment + emotions + confidence)
- Production-grade prompt engineering
"""

from pydantic import BaseModel, Field
from typing import List
from .base import BaseTool, ToolResult
from backend.resilience.llm_client import llm_client


class SentimentResult(BaseModel):
    """Structured sentiment analysis output."""
    sentiment: str = Field(description="Overall sentiment: positive, negative, neutral, or mixed")
    confidence: float = Field(ge=0, le=1, description="Confidence score 0-1")
    emotions: List[str] = Field(description="Detected emotions")
    key_phrases: List[str] = Field(description="Key phrases that drove the sentiment")
    summary: str = Field(description="Brief one-sentence summary of the sentiment")


class SentimentAnalyzerTool(BaseTool):
    """Analyze text sentiment, emotions, and key phrases using LLM."""

    name = "sentiment_analyzer"
    description = "Analyze text for sentiment (positive/negative/neutral), emotions, confidence score, and key phrases"

    async def execute(self, parameters: dict) -> ToolResult:
        text = parameters.get("text", "").strip()

        if not text:
            return ToolResult(success=False, data={}, error="No text provided")

        if len(text) > 5000:
            text = text[:5000]

        prompt = f"""You are a sentiment analysis engine. Analyze the following text and return a JSON response.

Text to analyze:
\"{text}\"

Return ONLY valid JSON with these exact fields:
{{
    "sentiment": "positive" | "negative" | "neutral" | "mixed",
    "confidence": 0.0-1.0,
    "emotions": ["list", "of", "detected", "emotions"],
    "key_phrases": ["phrases", "that", "drove", "the", "sentiment"],
    "summary": "Brief one-sentence summary of the overall sentiment"
}}

Be precise. Return ONLY the JSON."""

        try:
            result = llm_client.call_structured(prompt, SentimentResult)
            return ToolResult(
                success=True,
                data={
                    "text_length": len(text),
                    "sentiment": result.sentiment,
                    "confidence": result.confidence,
                    "emotions": result.emotions,
                    "key_phrases": result.key_phrases,
                    "summary": result.summary,
                },
            )
        except Exception as e:
            return ToolResult(
                success=False,
                data={"text_length": len(text)},
                error=str(e),
            )

    def get_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "Text to analyze for sentiment and emotions",
                }
            },
            "required": ["text"],
        }
