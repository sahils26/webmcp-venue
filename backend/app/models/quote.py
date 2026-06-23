"""Quote requests submitted from the landing page form / assistant."""
from datetime import date as date_type
from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import Index, text
from sqlmodel import Field, SQLModel


class QuoteStatus(str, Enum):
    new = "new"
    contacted = "contacted"
    closed = "closed"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class QuoteRequest(SQLModel, table=True):
    __tablename__ = "quote_requests"
    __table_args__ = (
        Index(
            "uq_quote_active_per_day",
            "venue_id",
            "date",
            unique=True,
            postgresql_where=text("status IN ('new', 'contacted')"),
            sqlite_where=text("status IN ('new', 'contacted')"),
        ),
    )

    id: int | None = Field(default=None, primary_key=True)
    # The room name as typed; ``venue_id`` is set when it resolves to a catalog venue.
    room_name: str
    venue_id: str | None = Field(default=None, foreign_key="venues.id", index=True)
    date: date_type | None = None
    email: str
    event_type: str | None = None
    guest_count: int | None = None
    message: str | None = None
    status: QuoteStatus = Field(default=QuoteStatus.new)
    created_at: datetime = Field(default_factory=_utcnow)
