import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import {
  readStoredVenueBookings,
  type VenueBooking,
} from './bookingStorage'

export interface BookingState {
  bookings: VenueBooking[]
}

const initialState: BookingState = {
  bookings: readStoredVenueBookings(),
}

export function getBookedDateKeysForVenue(
  bookings: VenueBooking[],
  venueId: string,
): string[] {
  return bookings
    .filter((booking) => booking.venueId === venueId)
    .map((booking) => booking.date)
}

export function isVenueDateBooked(
  bookings: VenueBooking[],
  venueId: string,
  date: string,
): boolean {
  return bookings.some(
    (booking) => booking.venueId === venueId && booking.date === date,
  )
}

const bookingSlice = createSlice({
  name: 'bookings',
  initialState,
  reducers: {
    venueQuoteRequested(state, action: PayloadAction<VenueBooking>) {
      const bookingExists = isVenueDateBooked(
        state.bookings,
        action.payload.venueId,
        action.payload.date,
      )

      if (!bookingExists) {
        state.bookings.push(action.payload)
      }
    },
  },
})

export const { venueQuoteRequested } = bookingSlice.actions

export const bookingReducer = bookingSlice.reducer

export const selectVenueBookings = (state: { bookings: BookingState }) =>
  state.bookings.bookings

export const selectBookedDateKeysByVenueId = (
  state: { bookings: BookingState },
  venueId: string,
) => getBookedDateKeysForVenue(state.bookings.bookings, venueId)
