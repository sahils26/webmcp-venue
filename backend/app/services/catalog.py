"""Build the frontend catalog with live booking and quote-hold state."""
from collections import defaultdict
from datetime import date, timedelta

from sqlmodel import Session, select

from ..models.amenity import Amenity, AmenityTranslation, VenueAmenity
from ..models.booking import Booking, BookingStatus
from ..models.event_type import VenueEventType
from ..models.quote import QuoteRequest, QuoteStatus
from ..models.venue import Venue, VenueAvailableDate, VenueImage, VenueTranslation
from ..schemas.venue import (
    DetailedAmenity,
    LocalizedVenueOut,
    VenueCatalogOut,
    VenueTranslationOut,
)

DEFAULT_LOCALE = "en"


def _next_open_date(blocked_dates: set[str]) -> str:
    candidate = date.today()
    while candidate.isoformat() in blocked_dates:
        candidate += timedelta(days=1)
    return candidate.isoformat()


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

    blocked: dict[str, set[str]] = defaultdict(set)
    for row in session.exec(
        select(Booking).where(Booking.status == BookingStatus.confirmed)
    ).all():
        blocked[row.venue_id].add(row.date.isoformat())

    for row in session.exec(
        select(QuoteRequest).where(
            QuoteRequest.status.in_([QuoteStatus.new, QuoteStatus.contacted])
        )
    ).all():
        if row.venue_id is not None and row.date is not None:
            blocked[row.venue_id].add(row.date.isoformat())

    images: dict[str, list[str]] = defaultdict(list)
    for row in session.exec(
        select(VenueImage).order_by(VenueImage.venue_id, VenueImage.sort_order)
    ).all():
        images[row.venue_id].append(row.url)

    venue_amenities: dict[str, list[VenueAmenity]] = defaultdict(list)
    for row in session.exec(select(VenueAmenity)).all():
        venue_amenities[row.venue_id].append(row)

    venue_event_types: dict[str, list[str]] = defaultdict(list)
    for row in session.exec(
        select(VenueEventType).order_by(
            VenueEventType.venue_id,
            VenueEventType.sort_order,
        )
    ).all():
        venue_event_types[row.venue_id].append(row.event_type_id)

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

        today = date.today().isoformat()
        available_dates = [
            d
            for d in open_dates[venue.id]
            if d >= today and d not in blocked[venue.id]
        ]
        next_available = _next_open_date(blocked[venue.id])

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
                event_types=venue_event_types[venue.id],
                next_available_date=next_available,
                blocked_dates=sorted(d for d in blocked[venue.id] if d >= today),
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
