"""Database engine and session management."""
from collections.abc import Generator

from sqlmodel import Session, SQLModel, create_engine

from .config import get_settings

settings = get_settings()

# SQLite needs check_same_thread disabled for FastAPI's threaded request handling.
_connect_args = (
    {"check_same_thread": False}
    if settings.resolved_database_url.startswith("sqlite")
    else {}
)

engine = create_engine(
    settings.resolved_database_url,
    echo=False,
    connect_args=_connect_args,
    pool_pre_ping=True,
)


def create_db_and_tables() -> None:
    """Create tables from SQLModel metadata (used for local/dev bootstrap)."""
    # Importing models registers them on SQLModel.metadata.
    from . import models  # noqa: F401

    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a database session per request."""
    with Session(engine) as session:
        yield session
