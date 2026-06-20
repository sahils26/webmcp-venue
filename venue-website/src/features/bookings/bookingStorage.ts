export interface VenueBooking {
  id: string
  venueId: string
  venueName: string
  date: string
  email: string
  createdAt: string
}

const STORAGE_KEY = 'spaces360:venue-bookings'

function hasStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function isVenueBooking(value: unknown): value is VenueBooking {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const booking = value as Record<string, unknown>

  return (
    typeof booking.id === 'string' &&
    typeof booking.venueId === 'string' &&
    typeof booking.venueName === 'string' &&
    typeof booking.date === 'string' &&
    typeof booking.email === 'string' &&
    typeof booking.createdAt === 'string'
  )
}

export function readStoredVenueBookings(): VenueBooking[] {
  if (!hasStorage()) {
    return []
  }

  try {
    const rawBookings = window.localStorage.getItem(STORAGE_KEY)
    if (!rawBookings) {
      return []
    }

    const parsedBookings: unknown = JSON.parse(rawBookings)
    return Array.isArray(parsedBookings) ? parsedBookings.filter(isVenueBooking) : []
  } catch {
    return []
  }
}

export function writeStoredVenueBookings(bookings: VenueBooking[]) {
  if (!hasStorage()) {
    return
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings))
  } catch {
    // Frontend-only fallback: Redux state still blocks the date for this session.
  }
}

export function appendStoredVenueBooking(booking: VenueBooking) {
  const bookings = readStoredVenueBookings()
  const withoutDuplicate = bookings.filter(
    (storedBooking) =>
      storedBooking.venueId !== booking.venueId || storedBooking.date !== booking.date,
  )

  writeStoredVenueBookings([...withoutDuplicate, booking])
}
