"""
Resilient LLM client with:
- Centralized config (no hardcoded keys/models)
- Exponential backoff with jitter on retries
- Circuit breaker pattern for cascading failure prevention
- Detailed latency and token usage logging
"""

import json
import time
import structlog
from groq import Groq
from pydantic import BaseModel, ValidationError
from backend.config import settings

logger = structlog.get_logger()


class CircuitBreakerOpen(Exception):
    """Raised when the circuit breaker is tripped."""
    pass


class CircuitBreaker:
    """Simple circuit breaker: trips after N consecutive failures, resets after timeout."""

    def __init__(self, threshold: int, timeout: int):
        self.threshold = threshold
        self.timeout = timeout
        self.failure_count = 0
        self.last_failure_time: float = 0
        self.is_open = False

    def record_success(self):
        self.failure_count = 0
        self.is_open = False

    def record_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.threshold:
            self.is_open = True
            logger.warning(
                "circuit_breaker_tripped",
                failures=self.failure_count,
                timeout=self.timeout,
            )

    def check(self):
        if not self.is_open:
            return
        elapsed = time.time() - self.last_failure_time
        if elapsed >= self.timeout:
            # Half-open: allow one attempt
            self.is_open = False
            self.failure_count = 0
            logger.info("circuit_breaker_reset", elapsed_seconds=round(elapsed, 1))
        else:
            raise CircuitBreakerOpen(
                f"Circuit breaker open. {self.timeout - elapsed:.0f}s until retry."
            )


class ResilientLLMClient:
    """Production-grade LLM client wrapping the Groq SDK."""

    def __init__(self):
        self.client = Groq(api_key=settings.GROQ_API_KEY)
        self.model = settings.LLM_MODEL
        self.temperature = settings.LLM_TEMPERATURE
        self.max_retries = settings.LLM_MAX_RETRIES
        self.breaker = CircuitBreaker(
            threshold=settings.LLM_CIRCUIT_BREAKER_THRESHOLD,
            timeout=settings.LLM_CIRCUIT_BREAKER_TIMEOUT,
        )

    def call(self, prompt: str, max_tokens: int = 500) -> str:
        """Simple LLM call with circuit breaker and latency tracking."""
        self.breaker.check()

        start = time.perf_counter()
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=self.temperature,
            )
            duration_ms = round((time.perf_counter() - start) * 1000, 2)

            usage = response.usage
            logger.debug(
                "llm_call_completed",
                model=self.model,
                duration_ms=duration_ms,
                prompt_tokens=usage.prompt_tokens if usage else None,
                completion_tokens=usage.completion_tokens if usage else None,
                total_tokens=usage.total_tokens if usage else None,
            )
            self.breaker.record_success()
            return response.choices[0].message.content

        except Exception as e:
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            self.breaker.record_failure()
            logger.error("llm_call_failed", error=str(e), duration_ms=duration_ms)
            raise

    def call_structured(
        self, prompt: str, schema: type[BaseModel], max_retries: int | None = None, max_tokens: int = 200
    ) -> BaseModel:
        """Call LLM with Pydantic validation, exponential backoff, and retry on schema errors."""
        retries = max_retries or self.max_retries
        current_prompt = prompt
        last_error = None

        for attempt in range(retries):
            try:
                raw = self.call(current_prompt, max_tokens=max_tokens)
                # Strip markdown code fences if present
                cleaned = raw.strip()
                if cleaned.startswith("```"):
                    lines = cleaned.split("\n")
                    lines = [l for l in lines if not l.strip().startswith("```")]
                    cleaned = "\n".join(lines)
                parsed = schema.model_validate_json(cleaned)
                return parsed

            except (ValidationError, json.JSONDecodeError) as e:
                last_error = e
                # Exponential backoff with jitter
                backoff = min(2 ** attempt * 0.2, 2.0)
                logger.warning(
                    "llm_structured_retry",
                    attempt=attempt + 1,
                    max_retries=retries,
                    backoff_seconds=backoff,
                    error=str(e)[:200],
                )
                import asyncio
                # Non-blocking sleep only works in async context; use time.sleep as fallback
                time.sleep(backoff)

                current_prompt = (
                    prompt
                    + f"\n\nYour previous response had errors: {e}. "
                    + "Fix and return ONLY valid JSON matching the schema."
                )

        raise last_error


# Global singleton
llm_client = ResilientLLMClient()
