"""Liveness/readiness probe used by Render and local smoke tests."""
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlmodel import Session

from ..database import get_session

router = APIRouter(tags=["health"])


@router.get("/health")
def health(session: Session = Depends(get_session)) -> dict[str, str]:
    """Return ok when the process is up and the database is reachable."""
    db_ok = True
    try:
        session.exec(text("SELECT 1"))
    except Exception:  # pragma: no cover - surfaced via status field
        db_ok = False

    return {"status": "ok", "database": "ok" if db_ok else "unavailable"}
