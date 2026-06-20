"""Request/response schemas for bookings and availability."""
from datetime import date as date_type
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from ..models.booking import BookingStatus


class AvailabilityOut(BaseModel):
    venue_id: str
    date: date_type
    available: bool
    message: str


class BookingCreate(BaseModel):
    venue_id: str = Field(min_length=1, max_length=100)
    date: date_type
    contact_name: str = Field(min_length=1, max_length=200)
    contact_email: EmailStr
    event_type: str | None = Field(default=None, max_length=100)
    guest_count: int | None = Field(default=None, ge=1)

    @field_validator("date")
    @classmethod
    def date_must_not_be_past(cls, value: date_type) -> date_type:
        if value < date_type.today():
            raise ValueError("Booking date must be today or later.")
        return value


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
