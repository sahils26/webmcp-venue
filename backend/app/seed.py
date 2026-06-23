"""Seed the database from venue-website's static venueSearchResults.json.

Idempotent: refreshes venue catalog details while preserving venue rows,
bookings, and quote requests. Run with::

    python -m app.seed
"""
import json
from datetime import date
from pathlib import Path

from sqlmodel import Session, delete, select

from .config import BASE_DIR
from .database import create_db_and_tables, engine
from .models.amenity import Amenity, AmenityTranslation, VenueAmenity
from .models.booking import Booking
from .models.event_type import EventType, EventTypeTranslation, VenueEventType
from .models.quote import QuoteRequest
from .models.venue import Venue, VenueAvailableDate, VenueImage, VenueTranslation

CATALOG_PATH = BASE_DIR.parent / "venue-website" / "src" / "data" / "venueSearchResults.json"


def _load_catalog(path: Path) -> dict:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def _clear_catalog_details(session: Session) -> None:
    for model in (
        VenueEventType,
        EventTypeTranslation,
        VenueAmenity,
        AmenityTranslation,
        VenueImage,
        VenueAvailableDate,
        VenueTranslation,
        EventType,
        Amenity,
    ):
        session.exec(delete(model))


def _get_removable_stale_venues(
    session: Session,
    incoming_ids: set[str],
) -> list[Venue]:
    """Return obsolete venues after rejecting unsafe catalog changes."""
    stale = [venue for venue in session.exec(select(Venue)).all() if venue.id not in incoming_ids]
    for venue in stale:
        has_booking = session.exec(
            select(Booking.id).where(Booking.venue_id == venue.id)
        ).first()
        has_quote = session.exec(
            select(QuoteRequest.id).where(QuoteRequest.venue_id == venue.id)
        ).first()
        if has_booking is not None or has_quote is not None:
            raise RuntimeError(
                f"Cannot remove venue '{venue.id}' because transactions reference it."
            )
    return stale


def seed(path: Path = CATALOG_PATH) -> int:
    create_db_and_tables()
    catalog = _load_catalog(path)
    venues = catalog["venues"]
    incoming_ids = {venue["id"] for venue in venues}

    with Session(engine) as session:
        stale_venues = _get_removable_stale_venues(session, incoming_ids)
        _clear_catalog_details(session)
        for stale_venue in stale_venues:
            session.delete(stale_venue)
        session.flush()

        # Amenities are global; collect icons across all venues first.
        amenity_icons: dict[str, str] = {}
        event_type_ids: set[str] = set()
        for venue in venues:
            for amenity in venue.get("detailed_amenities", []):
                amenity_icons.setdefault(amenity["id"], amenity.get("icon", ""))
            for amenity_id in venue.get("top_amenities", []):
                amenity_icons.setdefault(amenity_id, "")
            event_type_ids.update(venue.get("event_types", []))

        for amenity_id, icon in amenity_icons.items():
            session.add(Amenity(id=amenity_id, icon=icon))
        for event_type_id in event_type_ids:
            session.add(EventType(id=event_type_id))
        session.flush()

        # Flush core venue rows before inserting child rows. This keeps SQLite
        # foreign-key enforcement equivalent to Postgres during local seeding.
        for venue in venues:
            available = sorted(venue.get("all_available_dates", []))
            next_available = venue.get("next_available_date") or (available[0] if available else None)

            next_available_date = (
                date.fromisoformat(next_available) if next_available else None
            )
            venue_row = session.get(Venue, venue["id"])
            if venue_row is None:
                venue_row = Venue(
                    id=venue["id"],
                    capacity=venue["capacity"],
                    price_per_day=venue["price_per_day"],
                    thumbnail_url=venue["thumbnail_url"],
                    dimensions=venue.get("dimensions", ""),
                    next_available_date=next_available_date,
                )
            else:
                venue_row.capacity = venue["capacity"]
                venue_row.price_per_day = venue["price_per_day"]
                venue_row.thumbnail_url = venue["thumbnail_url"]
                venue_row.dimensions = venue.get("dimensions", "")
                venue_row.next_available_date = next_available_date
            session.add(venue_row)
        session.flush()

        for venue in venues:
            available = sorted(venue.get("all_available_dates", []))
            for day in available:
                session.add(VenueAvailableDate(venue_id=venue["id"], date=date.fromisoformat(day)))

            for index, url in enumerate(venue.get("gallery_images", [])):
                session.add(VenueImage(venue_id=venue["id"], url=url, sort_order=index))

            for event_type_index, event_type_id in enumerate(venue.get("event_types", [])):
                session.add(
                    VenueEventType(
                        venue_id=venue["id"],
                        event_type_id=event_type_id,
                        sort_order=event_type_index,
                    )
                )

            top_ids = venue.get("top_amenities", [])
            top = set(top_ids)
            amenity_ids = list(
                dict.fromkeys(
                    [a["id"] for a in venue.get("detailed_amenities", [])] + top_ids
                )
            )
            for amenity_id in amenity_ids:
                session.add(
                    VenueAmenity(venue_id=venue["id"], amenity_id=amenity_id, is_top=amenity_id in top)
                )

            for locale, copy in venue.get("translations", {}).items():
                session.add(
                    VenueTranslation(
                        venue_id=venue["id"],
                        locale=locale,
                        name=copy["name"],
                        location=copy["location"],
                        description=copy["description"],
                        cancellation_policy=copy["cancellation_policy"],
                    )
                )
                compact = copy.get("compact_amenity_labels", {})
                detailed = copy.get("detailed_amenity_labels", {})
                for amenity_id in set(compact) | set(detailed):
                    session.add(
                        AmenityTranslation(
                            venue_id=venue["id"],
                            amenity_id=amenity_id,
                            locale=locale,
                            compact_label=compact.get(amenity_id, detailed.get(amenity_id, amenity_id)),
                            detailed_label=detailed.get(amenity_id, compact.get(amenity_id, amenity_id)),
                        )
                    )

        session.commit()
    return len(venues)


if __name__ == "__main__":
    count = seed()
    print(f"Seeded {count} venues from {CATALOG_PATH}")
