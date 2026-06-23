"""Response schemas that reproduce the frontend's localized venue catalog.

These mirror ``VenueSearchResultCatalog`` / ``LocalizedVenueSearchResult`` in
venue-website/src/types/venue.ts so the website can swap its static JSON import
for this endpoint with no shape changes.
"""
from pydantic import BaseModel


class DetailedAmenity(BaseModel):
    id: str
    icon: str


class VenueTranslationOut(BaseModel):
    name: str
    location: str
    description: str
    cancellation_policy: str
    compact_amenity_labels: dict[str, str]
    detailed_amenity_labels: dict[str, str]


class LocalizedVenueOut(BaseModel):
    id: str
    capacity: int
    price_per_day: int
    thumbnail_url: str
    top_amenities: list[str]
    event_types: list[str]
    next_available_date: str
    blocked_dates: list[str]
    detailed_amenities: list[DetailedAmenity]
    all_available_dates: list[str]
    gallery_images: list[str]
    dimensions: str
    translations: dict[str, VenueTranslationOut]


class VenueCatalogOut(BaseModel):
    default_locale: str
    supported_locales: list[str]
    venues: list[LocalizedVenueOut]
