"""Request/response schemas for quote requests."""
from datetime import date as date_type
from datetime import datetime

from pydantic import BaseModel, EmailStr

from ..models.quote import QuoteStatus


class QuoteCreate(BaseModel):
    room_name: str
    email: EmailStr
    date: date_type | None = None
    event_type: str | None = None
    guest_count: int | None = None
    message: str | None = None


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
