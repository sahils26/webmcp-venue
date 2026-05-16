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

/**
 * Amenity detail used by the venue search result cards.
 */
export interface DetailedVenueAmenity {
  /** Stable amenity id used for icons and keys. */
  id: string

  /** Compact visual marker supplied by the venue payload. */
  icon: string
}

/**
 * Locale codes supported by the static venue search catalog.
 */
export type VenueLocale = 'en' | 'de'

/**
 * Translatable copy for one venue search result.
 */
export interface VenueSearchResultTranslation {
  /** Venue display name. */
  name: string

  /** City or locality shown in the card metadata. */
  location: string

  /** Expanded venue description. */
  description: string

  /** Booking cancellation policy. */
  cancellation_policy: string

  /** Compact amenity labels keyed by amenity id. */
  compact_amenity_labels: Record<string, string>

  /** Detailed amenity labels keyed by amenity id. */
  detailed_amenity_labels: Record<string, string>
}

/**
 * Locale-ready source venue result stored in JSON.
 */
export interface LocalizedVenueSearchResult {
  /** Stable venue id. */
  id: string

  /** Maximum guest count. */
  capacity: number

  /** Daily price in euros. */
  price_per_day: number

  /** Thumbnail image path from the venue payload. */
  thumbnail_url: string

  /** Short amenity ids rendered in the compact state. */
  top_amenities: string[]

  /** Next available date in yyyy-mm-dd format. */
  next_available_date: string

  /** Full amenity set for the expanded state without translated labels. */
  detailed_amenities: DetailedVenueAmenity[]

  /** Available dates in yyyy-mm-dd format. */
  all_available_dates: string[]

  /** Additional photo paths from the venue payload. */
  gallery_images: string[]

  /** Venue room dimensions. */
  dimensions: string

  /** Locale-specific copy for this venue. */
  translations: Record<VenueLocale, VenueSearchResultTranslation>
}

/**
 * Locale-ready venue search catalog loaded from JSON.
 */
export interface VenueSearchResultCatalog {
  /** Locale used when no language is selected. */
  default_locale: VenueLocale

  /** Locales currently shipped in the catalog. */
  supported_locales: VenueLocale[]

  /** Localized venue payloads. */
  venues: LocalizedVenueSearchResult[]
}

/**
 * Amenity detail with the selected locale label applied.
 */
export interface TranslatedVenueAmenity extends DetailedVenueAmenity {
  /** Human-readable amenity label for the selected locale. */
  label: string
}

/**
 * Rich venue result payload used by compact and expanded search cards.
 */
export interface VenueSearchResult {
  /** Stable venue id. */
  id: string

  /** Venue display name. */
  name: string

  /** Maximum guest count. */
  capacity: number

  /** City or locality shown in the card metadata. */
  location: string

  /** Daily price in euros. */
  price_per_day: number

  /** Thumbnail image path from the venue payload. */
  thumbnail_url: string

  /** Short amenity ids rendered in the compact state. */
  top_amenities: string[]

  /** Compact amenity labels keyed by amenity id for the selected locale. */
  compact_amenity_labels: Record<string, string>

  /** Next available date in yyyy-mm-dd format. */
  next_available_date: string

  /** Expanded venue description. */
  description: string

  /** Full amenity set for the expanded state. */
  detailed_amenities: TranslatedVenueAmenity[]

  /** Available dates in yyyy-mm-dd format. */
  all_available_dates: string[]

  /** Additional photo paths from the venue payload. */
  gallery_images: string[]

  /** Booking cancellation policy. */
  cancellation_policy: string

  /** Venue room dimensions. */
  dimensions: string
}
