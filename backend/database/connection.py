"""
Database connection management with proper connection pooling.
All config imported from centralized settings.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from backend.config import settings
from .models import Base

# Configure engine with proper pooling for production
_connect_args = {}
_poolclass = None

if settings.DATABASE_URL.startswith("sqlite"):
    # SQLite needs special handling
    _connect_args["check_same_thread"] = False
    _poolclass = StaticPool

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=_connect_args,
    pool_size=settings.DB_POOL_SIZE if not settings.DATABASE_URL.startswith("sqlite") else 0,
    max_overflow=settings.DB_MAX_OVERFLOW if not settings.DATABASE_URL.startswith("sqlite") else 0,
    pool_timeout=settings.DB_POOL_TIMEOUT if not settings.DATABASE_URL.startswith("sqlite") else 0,
    pool_recycle=settings.DB_POOL_RECYCLE if not settings.DATABASE_URL.startswith("sqlite") else -1,
    **({"poolclass": _poolclass} if _poolclass else {}),
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """Create all tables from models."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """FastAPI dependency — yields a scoped DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
