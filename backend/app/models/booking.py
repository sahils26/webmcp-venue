"""Bookings, with a partial unique index preventing double-booking."""
from datetime import date as date_type
from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import Index, text
from sqlmodel import Field, SQLModel


class BookingStatus(str, Enum):
    pending = "pending"
    confirmed = "confirmed"
    cancelled = "cancelled"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Booking(SQLModel, table=True):
    __tablename__ = "bookings"
    # A venue can have at most one *confirmed* booking per date. Pending and
    # cancelled bookings are exempt, so the constraint is a partial unique index.
    __table_args__ = (
        Index(
            "uq_booking_confirmed_per_day",
            "venue_id",
            "date",
            unique=True,
            postgresql_where=text("status = 'confirmed'"),
            sqlite_where=text("status = 'confirmed'"),
        ),
    )

    id: int | None = Field(default=None, primary_key=True)
    venue_id: str = Field(foreign_key="venues.id", index=True)
    date: date_type
    status: BookingStatus = Field(default=BookingStatus.pending)
    contact_name: str
    contact_email: str
    event_type: str | None = None
    guest_count: int | None = None
    created_at: datetime = Field(default_factory=_utcnow)
