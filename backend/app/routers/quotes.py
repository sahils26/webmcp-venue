"""Quote request persistence (replaces the browser-only quote slice)."""
from secrets import compare_digest

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from ..config import Settings, get_settings
from ..database import get_session
from ..models.quote import QuoteRequest
from ..schemas.quote import QuoteCreate, QuoteOut
from ..services.availability import get_availability, resolve_venue

router = APIRouter(prefix="/api/quotes", tags=["quotes"])


def require_admin_key(
    x_admin_api_key: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> None:
    """Protect endpoints that expose customer contact details."""
    if not x_admin_api_key or not compare_digest(x_admin_api_key, settings.admin_api_key):
        raise HTTPException(status_code=401, detail="A valid admin API key is required.")


@router.post("", response_model=QuoteOut, status_code=201)
def create_quote(
    payload: QuoteCreate,
    session: Session = Depends(get_session),
) -> QuoteRequest:
    venue = resolve_venue(session, payload.room_name)
    if venue is None:
        raise HTTPException(status_code=404, detail=f"Venue '{payload.room_name}' not found")

    if payload.guest_count is not None and payload.guest_count > venue.capacity:
        raise HTTPException(
            status_code=422,
            detail=f"Guest count exceeds {venue.id}'s capacity of {venue.capacity}.",
        )

    availability = get_availability(session, venue, payload.date)
    if not availability.available:
        raise HTTPException(status_code=409, detail=availability.reason)

    quote = QuoteRequest(
        room_name=payload.room_name,
        venue_id=venue.id,
        date=payload.date,
        email=payload.email,
        event_type=payload.event_type,
        guest_count=payload.guest_count,
        message=payload.message,
    )
    session.add(quote)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(
            status_code=409,
            detail=f"{venue.id} is already held on {payload.date.isoformat()}.",
        )
    session.refresh(quote)
    return quote


@router.get("", response_model=list[QuoteOut], dependencies=[Depends(require_admin_key)])
def list_quotes(session: Session = Depends(get_session)) -> list[QuoteRequest]:
    return session.exec(select(QuoteRequest).order_by(QuoteRequest.created_at.desc())).all()
