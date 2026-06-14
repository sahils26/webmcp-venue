"""Availability checks and booking creation (replaces localStorage bookings)."""
from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from ..database import get_session
from ..models.booking import Booking, BookingStatus
from ..models.venue import Venue, VenueAvailableDate
from ..schemas.booking import AvailabilityOut, BookingCreate, BookingOut

router = APIRouter(prefix="/api", tags=["bookings"])


def _is_open_date(session: Session, venue_id: str, day: date_type) -> bool:
    return (
        session.exec(
            select(VenueAvailableDate).where(
                VenueAvailableDate.venue_id == venue_id,
                VenueAvailableDate.date == day,
            )
        ).first()
        is not None
    )


def _confirmed_booking(session: Session, venue_id: str, day: date_type) -> Booking | None:
    return session.exec(
        select(Booking).where(
            Booking.venue_id == venue_id,
            Booking.date == day,
            Booking.status == BookingStatus.confirmed,
        )
    ).first()


@router.get("/venues/{venue_id}/availability", response_model=AvailabilityOut)
def check_availability(
    venue_id: str,
    date: date_type,
    session: Session = Depends(get_session),
) -> AvailabilityOut:
    if session.get(Venue, venue_id) is None:
        raise HTTPException(status_code=404, detail=f"Venue '{venue_id}' not found")

    if not _is_open_date(session, venue_id, date):
        return AvailabilityOut(
            venue_id=venue_id, date=date, available=False,
            message=f"{venue_id} is not offered on {date.isoformat()}.",
        )

    if _confirmed_booking(session, venue_id, date) is not None:
        return AvailabilityOut(
            venue_id=venue_id, date=date, available=False,
            message=f"{venue_id} is already booked on {date.isoformat()}.",
        )

    return AvailabilityOut(
        venue_id=venue_id, date=date, available=True,
        message=f"{venue_id} is available on {date.isoformat()}.",
    )


@router.post("/bookings", response_model=BookingOut, status_code=201)
def create_booking(
    payload: BookingCreate,
    session: Session = Depends(get_session),
) -> Booking:
    if session.get(Venue, payload.venue_id) is None:
        raise HTTPException(status_code=404, detail=f"Venue '{payload.venue_id}' not found")

    if not _is_open_date(session, payload.venue_id, payload.date):
        raise HTTPException(
            status_code=409,
            detail=f"{payload.venue_id} is not offered on {payload.date.isoformat()}.",
        )

    if _confirmed_booking(session, payload.venue_id, payload.date) is not None:
        raise HTTPException(
            status_code=409,
            detail=f"{payload.venue_id} is already booked on {payload.date.isoformat()}.",
        )

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
