"""SQLModel table definitions.

Importing this package registers every table on ``SQLModel.metadata`` so that
Alembic autogeneration and ``create_all`` see the full schema.
"""
from .amenity import Amenity, AmenityTranslation, VenueAmenity
from .booking import Booking, BookingStatus
from .event_type import EventType, EventTypeTranslation, VenueEventType
from .quote import QuoteRequest, QuoteStatus
from .venue import Venue, VenueAvailableDate, VenueImage, VenueTranslation

__all__ = [
    "Amenity",
    "AmenityTranslation",
    "VenueAmenity",
    "Booking",
    "BookingStatus",
    "EventType",
    "EventTypeTranslation",
    "VenueEventType",
    "QuoteRequest",
    "QuoteStatus",
    "Venue",
    "VenueAvailableDate",
    "VenueImage",
    "VenueTranslation",
]
