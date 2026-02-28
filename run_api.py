"""
Application entrypoint.
Loads environment variables and launches the uvicorn server.
"""

from dotenv import load_dotenv
load_dotenv()  # Must be called before any backend imports

from backend.config import settings
from backend.api.main import app
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=settings.API_PORT,
        log_level=settings.LOG_LEVEL.lower(),
    )
