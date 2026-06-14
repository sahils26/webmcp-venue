"""Builds the localized venue catalog (frontend-compatible shape) from the DB.

A confirmed booking removes that date from a venue's advertised availability so
the catalog reflects real bookings, not just the static open dates.
"""
from collections import defaultdict

from sqlmodel import Session, select

from ..models.amenity import Amenity, AmenityTranslation, VenueAmenity
from ..models.booking import Booking, BookingStatus
from ..models.venue import Venue, VenueAvailableDate, VenueImage, VenueTranslation
from ..schemas.venue import (
    DetailedAmenity,
    LocalizedVenueOut,
    VenueCatalogOut,
    VenueTranslationOut,
)

DEFAULT_LOCALE = "en"


def _sorted_locales(locales: set[str]) -> list[str]:
    """Locales with the default first, then the rest alphabetically."""
    rest = sorted(locale for locale in locales if locale != DEFAULT_LOCALE)
    return ([DEFAULT_LOCALE] if DEFAULT_LOCALE in locales else []) + rest


def build_catalog(session: Session) -> VenueCatalogOut:
    venues = session.exec(select(Venue).order_by(Venue.id)).all()

    translations: dict[str, list[VenueTranslation]] = defaultdict(list)
    for row in session.exec(select(VenueTranslation)).all():
        translations[row.venue_id].append(row)

    open_dates: dict[str, list[str]] = defaultdict(list)
    for row in session.exec(
        select(VenueAvailableDate).order_by(VenueAvailableDate.date)
    ).all():
        open_dates[row.venue_id].append(row.date.isoformat())

    # Confirmed bookings block out advertised dates.
    booked: dict[str, set[str]] = defaultdict(set)
    for row in session.exec(
        select(Booking).where(Booking.status == BookingStatus.confirmed)
    ).all():
        booked[row.venue_id].add(row.date.isoformat())

    images: dict[str, list[str]] = defaultdict(list)
    for row in session.exec(
        select(VenueImage).order_by(VenueImage.venue_id, VenueImage.sort_order)
    ).all():
        images[row.venue_id].append(row.url)

    venue_amenities: dict[str, list[VenueAmenity]] = defaultdict(list)
    for row in session.exec(select(VenueAmenity)).all():
        venue_amenities[row.venue_id].append(row)

    amenity_icons = {a.id: a.icon for a in session.exec(select(Amenity)).all()}

    amenity_labels: dict[tuple[str, str, str], AmenityTranslation] = {}
    for row in session.exec(select(AmenityTranslation)).all():
        amenity_labels[(row.venue_id, row.amenity_id, row.locale)] = row

    locale_set: set[str] = {t.locale for rows in translations.values() for t in rows}
    supported_locales = _sorted_locales(locale_set or {DEFAULT_LOCALE})

    venues_out: list[LocalizedVenueOut] = []
    for venue in venues:
        links = venue_amenities[venue.id]
        amenity_ids = [link.amenity_id for link in links]
        top_amenities = [link.amenity_id for link in links if link.is_top]

        available_dates = [
            d for d in open_dates[venue.id] if d not in booked[venue.id]
        ]
        next_available = (
            venue.next_available_date.isoformat()
            if venue.next_available_date and venue.next_available_date.isoformat() in available_dates
            else (available_dates[0] if available_dates else "")
        )

        venue_translations: dict[str, VenueTranslationOut] = {}
        for tr in translations[venue.id]:
            compact = {}
            detailed = {}
            for amenity_id in amenity_ids:
                label = amenity_labels.get((venue.id, amenity_id, tr.locale))
                if label is not None:
                    compact[amenity_id] = label.compact_label
                    detailed[amenity_id] = label.detailed_label
            venue_translations[tr.locale] = VenueTranslationOut(
                name=tr.name,
                location=tr.location,
                description=tr.description,
                cancellation_policy=tr.cancellation_policy,
                compact_amenity_labels=compact,
                detailed_amenity_labels=detailed,
            )

        venues_out.append(
            LocalizedVenueOut(
                id=venue.id,
                capacity=venue.capacity,
                price_per_day=venue.price_per_day,
                thumbnail_url=venue.thumbnail_url,
                top_amenities=top_amenities,
                next_available_date=next_available,
                detailed_amenities=[
                    DetailedAmenity(id=a, icon=amenity_icons.get(a, "")) for a in amenity_ids
                ],
                all_available_dates=available_dates,
                gallery_images=images[venue.id],
                dimensions=venue.dimensions,
                translations=venue_translations,
            )
        )

    return VenueCatalogOut(
        default_locale=DEFAULT_LOCALE,
        supported_locales=supported_locales,
        venues=venues_out,
    )
