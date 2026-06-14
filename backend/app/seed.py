"""Seed the database from venue-website's static venueSearchResults.json.

Idempotent: wipes and rebuilds the venue *catalog* tables (venues, amenities,
translations, images, availability). Bookings and quote requests are left
untouched. Run with::

    python -m app.seed
"""
import json
from datetime import date
from pathlib import Path

from sqlmodel import Session, delete

from .config import BASE_DIR
from .database import create_db_and_tables, engine
from .models.amenity import Amenity, AmenityTranslation, VenueAmenity
from .models.venue import Venue, VenueAvailableDate, VenueImage, VenueTranslation

CATALOG_PATH = BASE_DIR.parent / "venue-website" / "src" / "data" / "venueSearchResults.json"


def _load_catalog(path: Path) -> dict:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def _wipe_catalog(session: Session) -> None:
    for model in (
        VenueAmenity,
        AmenityTranslation,
        VenueImage,
        VenueAvailableDate,
        VenueTranslation,
        Amenity,
        Venue,
    ):
        session.exec(delete(model))


def seed(path: Path = CATALOG_PATH) -> int:
    create_db_and_tables()
    catalog = _load_catalog(path)
    venues = catalog["venues"]

    with Session(engine) as session:
        _wipe_catalog(session)

        # Amenities are global; collect icons across all venues first.
        amenity_icons: dict[str, str] = {}
        for venue in venues:
            for amenity in venue.get("detailed_amenities", []):
                amenity_icons.setdefault(amenity["id"], amenity.get("icon", ""))
            for amenity_id in venue.get("top_amenities", []):
                amenity_icons.setdefault(amenity_id, "")

        for amenity_id, icon in amenity_icons.items():
            session.add(Amenity(id=amenity_id, icon=icon))

        for venue in venues:
            available = sorted(venue.get("all_available_dates", []))
            next_available = venue.get("next_available_date") or (available[0] if available else None)

            session.add(
                Venue(
                    id=venue["id"],
                    capacity=venue["capacity"],
                    price_per_day=venue["price_per_day"],
                    thumbnail_url=venue["thumbnail_url"],
                    dimensions=venue.get("dimensions", ""),
                    next_available_date=date.fromisoformat(next_available) if next_available else None,
                )
            )

            for day in available:
                session.add(VenueAvailableDate(venue_id=venue["id"], date=date.fromisoformat(day)))

            for index, url in enumerate(venue.get("gallery_images", [])):
                session.add(VenueImage(venue_id=venue["id"], url=url, sort_order=index))

            top = set(venue.get("top_amenities", []))
            amenity_ids = list(dict.fromkeys([a["id"] for a in venue.get("detailed_amenities", [])] + list(top)))
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
