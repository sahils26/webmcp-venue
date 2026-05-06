/**
 * Static room details displayed in the UI and returned by the room detail tool.
 */
export interface VenueRoom {
  /** Maximum number of guests supported by the room. */
  capacity: number

  /** Daily booking cost in the app's configured currency. */
  pricePerDay: number

  /** Whether built-in projector equipment is available in the room. */
  hasProjector: boolean
}

/**
 * Room inventory keyed by the human-readable room name shown to users.
 */
export type VenueRoomMap = Record<string, VenueRoom>

/**
 * Booked dates keyed by room name.
 * Each date must be normalized as yyyy-mm-dd.
 */
export type BookedDateMap = Record<string, string[]>

/**
 * Standard availability response returned to both UI code and assistant tools.
 */
export interface RoomAvailabilityResult {
  /** True when the room/date inputs were valid enough to evaluate. */
  success: boolean

  /** Canonical room name when matched, or the original requested room name. */
  roomName: string

  /** Normalized yyyy-mm-dd date, or an empty string when parsing failed. */
  date: string

  /** True only when the room exists, date is valid, and date is not booked. */
  available: boolean

  /** Human-readable status safe to display in the UI or return to the model. */
  message: string
}

/**
 * Controlled form state for the quote request panel.
 */
export interface QuoteDraft {
  /** Room name entered by the user or prepared by the assistant. */
  roomName: string

  /** Requested event date in yyyy-mm-dd format. */
  date: string

  /** Contact email address for the quote request. */
  email: string
}

/**
 * Normalized venue candidate returned from OpenStreetMap.
 */
export interface OSMVenue {
  /** OpenStreetMap element id. */
  id: number

  /** Display name from OSM tags, or a fallback when the venue is unnamed. */
  name: string

  /** Latitude from the node or calculated center. */
  latitude?: number

  /** Longitude from the node or calculated center. */
  longitude?: number

  /** Venue category from OSM tags such as "hotel" or "events_venue". */
  category: string
}
