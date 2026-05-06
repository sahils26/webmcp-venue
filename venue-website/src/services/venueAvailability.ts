import { bookedDates, roomNames, venueRooms } from '../data/venueData'
import type { RoomAvailabilityResult, VenueRoom } from '../types/venue'
import { normalizeDateKey } from '../utils/dateKeys'

/**
 * Resolves user/model supplied room names against the canonical room inventory.
 *
 * @param rawRoomName - Unknown room input from a form field or model tool call.
 * @returns The canonical room name when matched case-insensitively; otherwise the trimmed input.
 */
export function resolveRoomName(rawRoomName: unknown): string {
  const requestedRoomName = typeof rawRoomName === 'string' ? rawRoomName.trim() : ''

  return (
    roomNames.find((roomName) => roomName.toLowerCase() === requestedRoomName.toLowerCase()) ??
    requestedRoomName
  )
}

/**
 * Looks up room details using a potentially non-canonical room name.
 *
 * @param rawRoomName - Room name from the UI or model.
 * @returns VenueRoom details when the room exists; otherwise undefined.
 */
export function getRoomByName(rawRoomName: unknown): VenueRoom | undefined {
  return venueRooms[resolveRoomName(rawRoomName)]
}

/**
 * Validates a room/date pair and returns a model-safe availability response.
 *
 * @param rawRoomName - Room name from the UI or model.
 * @param rawDate - Date input in yyyy-mm-dd or supported natural language format.
 * @returns RoomAvailabilityResult with normalized values and display-safe message.
 */
export function getRoomAvailability(rawRoomName: unknown, rawDate: unknown): RoomAvailabilityResult {
  const roomName = resolveRoomName(rawRoomName)
  const date = normalizeDateKey(rawDate)

  if (!venueRooms[roomName]) {
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

  const isBooked = bookedDates[roomName]?.includes(date)

  if (isBooked) {
    return {
      success: true,
      roomName,
      date,
      available: false,
      message: `${roomName} is booked on ${date}.`,
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
