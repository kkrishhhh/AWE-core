"""
Production-grade API middleware: structured error handling, request timing, and logging.
"""

import time
import uuid
import structlog
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = structlog.get_logger()


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Adds trace_id, request timing, and structured error handling to every request."""

    async def dispatch(self, request: Request, call_next):
        # Generate or extract trace ID
        trace_id = request.headers.get("X-Trace-ID", str(uuid.uuid4()))
        request.state.trace_id = trace_id

        log = logger.bind(
            trace_id=trace_id,
            method=request.method,
            path=request.url.path,
        )

        start_time = time.perf_counter()

        try:
            response = await call_next(request)
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

            response.headers["X-Trace-ID"] = trace_id
            response.headers["X-Request-Duration-Ms"] = str(duration_ms)

            log.info(
                "request_completed",
                status_code=response.status_code,
                duration_ms=duration_ms,
            )
            return response

        except Exception as exc:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            log.error(
                "request_failed",
                error=str(exc),
                duration_ms=duration_ms,
                exc_info=True,
            )
            return JSONResponse(
                status_code=500,
                content={
                    "error": {
                        "code": "INTERNAL_SERVER_ERROR",
                        "message": "An unexpected error occurred.",
                        "trace_id": trace_id,
                    }
                },
                headers={
                    "X-Trace-ID": trace_id,
                    "X-Request-Duration-Ms": str(duration_ms),
                },
            )


async def http_exception_handler(request: Request, exc: HTTPException):
    """Structured error envelope for all HTTPExceptions."""
    trace_id = getattr(request.state, "trace_id", "unknown")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.status_code,
                "message": exc.detail,
                "trace_id": trace_id,
            }
        },
    )
