"""Amenity catalog, its translations, and the venue<->amenity link."""
from sqlmodel import Field, SQLModel


class Amenity(SQLModel, table=True):
    """A facility/amenity. ``id`` is the stable slug (e.g. ``projector``)."""

    __tablename__ = "amenities"

    id: str = Field(primary_key=True)
    icon: str


class AmenityTranslation(SQLModel, table=True):
    """Locale-specific compact and detailed labels for an amenity.

    Labels are venue-scoped: the catalog gives each venue its own wording for
    the same amenity id (e.g. a "projector" is described differently per venue),
    so the venue_id is part of the key.
    """

    __tablename__ = "venue_amenity_translations"

    venue_id: str = Field(foreign_key="venues.id", primary_key=True)
    amenity_id: str = Field(foreign_key="amenities.id", primary_key=True)
    locale: str = Field(primary_key=True)
    compact_label: str
    detailed_label: str


class VenueAmenity(SQLModel, table=True):
    """Join row marking which amenities a venue has; ``is_top`` flags the
    amenities surfaced on the compact search card."""

    __tablename__ = "venue_amenities"

    venue_id: str = Field(foreign_key="venues.id", primary_key=True)
    amenity_id: str = Field(foreign_key="amenities.id", primary_key=True)
    is_top: bool = False
