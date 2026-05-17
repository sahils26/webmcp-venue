import { venueSearchResults } from '../data/venueSearchResults'
import type { RoomAvailabilityResult, VenueRoom, VenueSearchResult } from '../types/venue'
import { formatVenueCurrency, VENUE_CURRENCY_CODE } from '../utils/currency'
import { normalizeDateKey } from '../utils/dateKeys'

function normalizeRoomLookupKey(roomName: string): string {
  return roomName
    .trim()
    .toLowerCase()
    .replace(/^the\s+/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
}

function getRoomLookupKeys(venue: VenueSearchResult): string[] {
  return [
    venue.name,
    venue.id,
    venue.name.replace(/^the\s+/i, ''),
    venue.id.replace(/[-_]+/g, ' '),
  ].map(normalizeRoomLookupKey)
}

function findVenueByRoomName(rawRoomName: unknown): VenueSearchResult | undefined {
  const requestedRoomName = typeof rawRoomName === 'string' ? rawRoomName.trim() : ''

  if (!requestedRoomName) {
    return undefined
  }

  const lookupKey = normalizeRoomLookupKey(requestedRoomName)

  return venueSearchResults.find((venue) => getRoomLookupKeys(venue).includes(lookupKey))
}

function hasProjector(venue: VenueSearchResult): boolean {
  return (
    venue.top_amenities.includes('projector') ||
    venue.detailed_amenities.some((amenity) => amenity.id === 'projector')
  )
}

function toVenueRoom(venue: VenueSearchResult): VenueRoom {
  return {
    id: venue.id,
    name: venue.name,
    capacity: venue.capacity,
    location: venue.location,
    pricePerDay: venue.price_per_day,
    currencyCode: VENUE_CURRENCY_CODE,
    formattedPricePerDay: formatVenueCurrency(venue.price_per_day),
    hasProjector: hasProjector(venue),
    availableDates: venue.all_available_dates,
  }
}

export const roomNames = venueSearchResults.map((venue) => venue.name)

/**
 * Resolves user/model supplied room names against the canonical JSON venue catalog.
 *
 * @param rawRoomName - Unknown room input from a form field or model tool call.
 * @returns The canonical room name when matched case-insensitively; otherwise the trimmed input.
 */
export function resolveRoomName(rawRoomName: unknown): string {
  const requestedRoomName = typeof rawRoomName === 'string' ? rawRoomName.trim() : ''

  return findVenueByRoomName(requestedRoomName)?.name ?? requestedRoomName
}

/**
 * Looks up venue details using a potentially non-canonical room name.
 *
 * @param rawRoomName - Room name from the UI or model.
 * @returns VenueRoom details when the room exists; otherwise undefined.
 */
export function getRoomByName(rawRoomName: unknown): VenueRoom | undefined {
  const venue = findVenueByRoomName(rawRoomName)

  return venue ? toVenueRoom(venue) : undefined
}

/**
 * Validates a room/date pair and returns a model-safe availability response.
 *
 * @param rawRoomName - Room name from the UI or model.
 * @param rawDate - Date input in yyyy-mm-dd or supported natural language format.
 * @returns RoomAvailabilityResult with normalized values and display-safe message.
 */
export function getRoomAvailability(rawRoomName: unknown, rawDate: unknown): RoomAvailabilityResult {
  const venue = findVenueByRoomName(rawRoomName)
  const roomName = venue?.name ?? resolveRoomName(rawRoomName)
  const date = normalizeDateKey(rawDate)

  if (!venue) {
    return {
      success: false,
      roomName,
      date,
      available: false,
      message: `Room '${roomName}' does not exist.`,
    }
  }

  if (!date) {
    return {
      success: false,
      roomName,
      date,
      available: false,
      message: 'Please provide a valid date for the quote request.',
    }
  }

  if (!venue.all_available_dates.includes(date)) {
    return {
      success: true,
      roomName,
      date,
      available: false,
      message: `${roomName} is not available on ${date}.`,
    }
  }

  return {
    success: true,
    roomName,
    date,
    available: true,
    message: `${roomName} is available on ${date}.`,
  }
}
