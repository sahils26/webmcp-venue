"""Request/response schemas for quote requests."""
from datetime import date as date_type
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from ..models.quote import QuoteStatus


class QuoteCreate(BaseModel):
    room_name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    date: date_type
    event_type: str | None = Field(default=None, max_length=100)
    guest_count: int | None = Field(default=None, ge=1)
    message: str | None = Field(default=None, max_length=2000)

    @field_validator("date")
    @classmethod
    def date_must_not_be_past(cls, value: date_type) -> date_type:
        if value < date_type.today():
            raise ValueError("Quote date must be today or later.")
        return value


class QuoteOut(BaseModel):
    id: int
    room_name: str
    venue_id: str | None = None
    date: date_type | None = None
    email: str
    event_type: str | None = None
    guest_count: int | None = None
    message: str | None = None
    status: QuoteStatus
    created_at: datetime
