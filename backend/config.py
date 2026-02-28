"""
Centralized application configuration via Pydantic Settings.

All environment variables are validated at import time.
Every module imports `settings` from here instead of using os.getenv().
"""

from pydantic_settings import BaseSettings
from pydantic import Field, field_validator
from typing import List
from functools import lru_cache


class Settings(BaseSettings):
    """Application-wide settings loaded from environment variables."""

    # ── Core ──────────────────────────────────────────────
    ENVIRONMENT: str = Field(default="development", description="development | staging | production")
    API_PORT: int = Field(default=8001, description="Port for the FastAPI server")
    LOG_LEVEL: str = Field(default="INFO", description="Logging level")

    # ── Security ──────────────────────────────────────────
    GROQ_API_KEY: str = Field(..., description="Groq API key for LLM calls")
    
    # ── Database ──────────────────────────────────────────
    DATABASE_URL: str = Field(
        default="sqlite:///./agentic_workflow.db",
        description="Database connection string"
    )
    DB_POOL_SIZE: int = Field(default=5, description="SQLAlchemy connection pool size")
    DB_MAX_OVERFLOW: int = Field(default=10, description="Max overflow connections")
    DB_POOL_TIMEOUT: int = Field(default=30, description="Pool checkout timeout in seconds")
    DB_POOL_RECYCLE: int = Field(default=1800, description="Recycle connections after N seconds")

    # ── LLM ───────────────────────────────────────────────
    LLM_MODEL: str = Field(default="llama-3.3-70b-versatile", description="Groq model identifier")
    LLM_MAX_RETRIES: int = Field(default=3, description="Max retries for structured LLM calls")
    LLM_TEMPERATURE: float = Field(default=0.1, description="LLM temperature")
    LLM_CIRCUIT_BREAKER_THRESHOLD: int = Field(
        default=5, description="Trip circuit breaker after N consecutive failures"
    )
    LLM_CIRCUIT_BREAKER_TIMEOUT: int = Field(
        default=60, description="Seconds before resetting circuit breaker"
    )

    # ── CORS ──────────────────────────────────────────────
    CORS_ORIGINS: List[str] = Field(
        default=["http://localhost:3000"],
        description="Allowed CORS origins (comma-separated in env)"
    )

    # ── Workers ───────────────────────────────────────────
    WORKER_CONCURRENCY: int = Field(default=1, description="Number of concurrent background workers")

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
        "extra": "ignore",
    }


@lru_cache()
def get_settings() -> Settings:
    """Cached settings singleton. Call this instead of constructing Settings directly."""
    return Settings()


# Global convenience export
settings = get_settings()
