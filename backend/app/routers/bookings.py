"""Availability checks and booking creation (replaces localStorage bookings)."""
from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from ..database import get_session
from ..models.booking import Booking, BookingStatus
from ..models.venue import Venue
from ..schemas.booking import AvailabilityOut, BookingCreate, BookingOut
from ..services.availability import get_availability

router = APIRouter(prefix="/api", tags=["bookings"])


@router.get("/venues/{venue_id}/availability", response_model=AvailabilityOut)
def check_availability(
    venue_id: str,
    date: date_type,
    session: Session = Depends(get_session),
) -> AvailabilityOut:
    venue = session.get(Venue, venue_id)
    if venue is None:
        raise HTTPException(status_code=404, detail=f"Venue '{venue_id}' not found")

    availability = get_availability(session, venue, date)
    return AvailabilityOut(
        venue_id=venue_id,
        date=date,
        available=availability.available,
        message=availability.reason,
    )


@router.post("/bookings", response_model=BookingOut, status_code=201)
def create_booking(
    payload: BookingCreate,
    session: Session = Depends(get_session),
) -> Booking:
    venue = session.get(Venue, payload.venue_id)
    if venue is None:
        raise HTTPException(status_code=404, detail=f"Venue '{payload.venue_id}' not found")

    if payload.guest_count is not None and payload.guest_count > venue.capacity:
        raise HTTPException(
            status_code=422,
            detail=f"Guest count exceeds {payload.venue_id}'s capacity of {venue.capacity}.",
        )

    availability = get_availability(session, venue, payload.date)
    if not availability.available:
        raise HTTPException(status_code=409, detail=availability.reason)

    booking = Booking(
        venue_id=payload.venue_id,
        date=payload.date,
        status=BookingStatus.confirmed,
        contact_name=payload.contact_name,
        contact_email=payload.contact_email,
        event_type=payload.event_type,
        guest_count=payload.guest_count,
    )
    session.add(booking)
    try:
        session.commit()
    except IntegrityError:
        # Lost the race against a concurrent confirmed booking.
        session.rollback()
        raise HTTPException(
            status_code=409,
            detail=f"{payload.venue_id} is already booked on {payload.date.isoformat()}.",
        )
    session.refresh(booking)
    return booking
