"""Liveness/readiness probe used by Render and local smoke tests."""
from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import text
from sqlmodel import Session

from ..database import get_session

router = APIRouter(tags=["health"])


@router.get("/health")
def health(
    response: Response,
    session: Session = Depends(get_session),
) -> dict[str, str]:
    """Return ok when the process is up and the database is reachable."""
    db_ok = True
    try:
        session.exec(text("SELECT 1"))
    except Exception:  # pragma: no cover - surfaced via status field
        db_ok = False

    if not db_ok:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": "ok" if db_ok else "unavailable",
        "database": "ok" if db_ok else "unavailable",
    }
