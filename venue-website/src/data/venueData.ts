import type { BookedDateMap, VenueRoomMap } from '../types/venue'

/**
 * Static room inventory used by the room listing UI and local assistant tools.
 *
 * Key format:
 * - Use the exact display name users should see in the app.
 *
 * Value format:
 * - capacity: maximum guest count.
 * - pricePerDay: daily room rate.
 * - hasProjector: equipment availability shown in room details.
 *
 * Replace this module with an API-backed repository when backend inventory is ready.
 */
export const venueRooms: VenueRoomMap = {
  'Grand Hall': { capacity: 500, pricePerDay: 2500, hasProjector: true },
  'Meeting Room A': { capacity: 20, pricePerDay: 300, hasProjector: true },
  Lounge: { capacity: 50, pricePerDay: 800, hasProjector: false },
}

/**
 * Date keys that are already blocked for each room.
 *
 * Keys must match a room name from venueRooms. Values must use yyyy-mm-dd so
 * native date inputs, model tool calls, and availability checks share one format.
 */
export const bookedDates: BookedDateMap = {
  'Grand Hall': ['2026-05-15', '2026-05-16'],
  'Meeting Room A': ['2026-05-15'],
  Lounge: [],
}

/**
 * Canonical room names derived from venueRooms.
 * Use this list for validation messages and option rendering.
 */
export const roomNames = Object.keys(venueRooms)
