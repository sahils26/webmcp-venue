"""Shared venue lookup and availability rules for bookings and quotes."""
from dataclasses import dataclass
from datetime import date

from sqlmodel import Session, select

from ..models.booking import Booking, BookingStatus
from ..models.quote import QuoteRequest, QuoteStatus
from ..models.venue import Venue, VenueTranslation


@dataclass(frozen=True)
class AvailabilityResult:
    venue: Venue
    date: date
    available: bool
    reason: str


def resolve_venue(session: Session, room_name: str) -> Venue | None:
    """Resolve a venue slug or localized display name to its catalog row."""
    key = room_name.strip().lower()
    if not key:
        return None

    slug = key.replace(" ", "-")
    venue = session.get(Venue, slug)
    if venue is not None:
        return venue

    translation = session.exec(select(VenueTranslation)).all()
    for row in translation:
        if row.name.strip().lower() == key:
            return session.get(Venue, row.venue_id)
    return None


def get_availability(
    session: Session,
    venue: Venue,
    day: date,
) -> AvailabilityResult:
    """Return the authoritative availability state for one venue and date."""
    if day < date.today():
        return AvailabilityResult(
            venue=venue,
            date=day,
            available=False,
            reason=f"{day.isoformat()} is in the past.",
        )

    booking = session.exec(
        select(Booking).where(
            Booking.venue_id == venue.id,
            Booking.date == day,
            Booking.status == BookingStatus.confirmed,
        )
    ).first()
    if booking is not None:
        return AvailabilityResult(
            venue=venue,
            date=day,
            available=False,
            reason=f"{venue.id} is already booked on {day.isoformat()}.",
        )

    quote_hold = session.exec(
        select(QuoteRequest).where(
            QuoteRequest.venue_id == venue.id,
            QuoteRequest.date == day,
            QuoteRequest.status.in_([QuoteStatus.new, QuoteStatus.contacted]),
        )
    ).first()
    if quote_hold is not None:
        return AvailabilityResult(
            venue=venue,
            date=day,
            available=False,
            reason=f"{venue.id} is already held on {day.isoformat()}.",
        )

    return AvailabilityResult(
        venue=venue,
        date=day,
        available=True,
        reason=f"{venue.id} is available on {day.isoformat()}.",
    )
