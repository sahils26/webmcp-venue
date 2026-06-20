"""Quote request persistence (replaces the browser-only quote slice)."""
from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from ..database import get_session
from ..models.quote import QuoteRequest
from ..models.venue import Venue, VenueTranslation
from ..schemas.quote import QuoteCreate, QuoteOut

router = APIRouter(prefix="/api/quotes", tags=["quotes"])


def _resolve_venue_id(session: Session, room_name: str) -> str | None:
    """Best-effort match of a typed room name to a catalog venue id."""
    key = room_name.strip().lower()
    if not key:
        return None

    # Direct id match (slug typed in).
    slug = key.replace(" ", "-")
    if session.get(Venue, slug) is not None:
        return slug

    # Match against any localized venue name (case-insensitive).
    for tr in session.exec(select(VenueTranslation)).all():
        if tr.name.strip().lower() == key:
            return tr.venue_id
    return None


@router.post("", response_model=QuoteOut, status_code=201)
def create_quote(
    payload: QuoteCreate,
    session: Session = Depends(get_session),
) -> QuoteRequest:
    quote = QuoteRequest(
        room_name=payload.room_name,
        venue_id=_resolve_venue_id(session, payload.room_name),
        date=payload.date,
        email=payload.email,
        event_type=payload.event_type,
        guest_count=payload.guest_count,
        message=payload.message,
    )
    session.add(quote)
    session.commit()
    session.refresh(quote)
    return quote


@router.get("", response_model=list[QuoteOut])
def list_quotes(session: Session = Depends(get_session)) -> list[QuoteRequest]:
    return session.exec(select(QuoteRequest).order_by(QuoteRequest.created_at.desc())).all()
