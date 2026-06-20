"""Read API for the venue catalog."""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from ..database import get_session
from ..schemas.venue import LocalizedVenueOut, VenueCatalogOut
from ..services.catalog import build_catalog

router = APIRouter(prefix="/api/venues", tags=["venues"])


@router.get("", response_model=VenueCatalogOut)
def list_venues(session: Session = Depends(get_session)) -> VenueCatalogOut:
    """Return the full localized venue catalog (same shape as the static JSON)."""
    return build_catalog(session)


@router.get("/{venue_id}", response_model=LocalizedVenueOut)
def get_venue(venue_id: str, session: Session = Depends(get_session)) -> LocalizedVenueOut:
    catalog = build_catalog(session)
    for venue in catalog.venues:
        if venue.id == venue_id:
            return venue
    raise HTTPException(status_code=404, detail=f"Venue '{venue_id}' not found")
