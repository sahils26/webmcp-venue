"""Request/response schemas for bookings and availability."""
from datetime import date as date_type
from datetime import datetime

from pydantic import BaseModel, EmailStr

from ..models.booking import BookingStatus


class AvailabilityOut(BaseModel):
    venue_id: str
    date: date_type
    available: bool
    message: str


class BookingCreate(BaseModel):
    venue_id: str
    date: date_type
    contact_name: str
    contact_email: EmailStr
    event_type: str | None = None
    guest_count: int | None = None


class BookingOut(BaseModel):
    id: int
    venue_id: str
    date: date_type
    status: BookingStatus
    contact_name: str
    contact_email: str
    event_type: str | None = None
    guest_count: int | None = None
    created_at: datetime
