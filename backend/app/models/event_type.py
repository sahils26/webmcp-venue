"""Event types (conference, wedding, ...) and the venue<->event-type link.

No event-type data ships in the current JSON catalog, so these tables exist for
the event-type feature but are seeded empty until categories are defined.
"""
from sqlmodel import Field, SQLModel


class EventType(SQLModel, table=True):
    __tablename__ = "event_types"

    id: str = Field(primary_key=True)
    icon: str | None = None


class EventTypeTranslation(SQLModel, table=True):
    __tablename__ = "event_type_translations"

    event_type_id: str = Field(foreign_key="event_types.id", primary_key=True)
    locale: str = Field(primary_key=True)
    label: str


class VenueEventType(SQLModel, table=True):
    __tablename__ = "venue_event_types"

    venue_id: str = Field(foreign_key="venues.id", primary_key=True)
    event_type_id: str = Field(foreign_key="event_types.id", primary_key=True)
