"""Venue core tables: venue, its localized copy, offered dates, and images."""
from datetime import date as date_type

from sqlmodel import Field, SQLModel


class Venue(SQLModel, table=True):
    """A bookable venue. ``id`` is the stable slug from the JSON catalog."""

    __tablename__ = "venues"

    id: str = Field(primary_key=True)
    capacity: int
    price_per_day: int
    currency_code: str = Field(default="EUR")
    thumbnail_url: str
    dimensions: str
    # Derived/denormalized convenience field kept in sync by the seed/booking
    # logic; the authoritative open dates live in ``venue_available_dates``.
    next_available_date: date_type | None = None


class VenueTranslation(SQLModel, table=True):
    """Locale-specific copy for a venue."""

    __tablename__ = "venue_translations"

    venue_id: str = Field(foreign_key="venues.id", primary_key=True)
    locale: str = Field(primary_key=True)
    name: str
    location: str
    description: str
    cancellation_policy: str


class VenueAvailableDate(SQLModel, table=True):
    """A date the venue is offered for booking (the catalog's open dates)."""

    __tablename__ = "venue_available_dates"

    venue_id: str = Field(foreign_key="venues.id", primary_key=True)
    date: date_type = Field(primary_key=True)


class VenueImage(SQLModel, table=True):
    """Gallery image for a venue, ordered by ``sort_order``."""

    __tablename__ = "venue_images"

    id: int | None = Field(default=None, primary_key=True)
    venue_id: str = Field(foreign_key="venues.id", index=True)
    url: str
    sort_order: int = 0
