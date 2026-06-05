import { type ChangeEvent, type FormEvent, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import ContactSection from '../components/landing/ContactSection'
import GallerySection from '../components/landing/GallerySection'
import HeroSection from '../components/landing/HeroSection'
import QuoteRequestSection from '../components/landing/QuoteRequestSection'
import SiteFooter from '../components/landing/SiteFooter'
import SiteHeader from '../components/landing/SiteHeader'
import { venueSearchResults } from '../data/venueSearchResults'
import {
  isQuoteDraftField,
  quoteDraftFieldChanged,
  selectQuoteHandoffRequestKey,
  quoteStatusSet,
  selectQuoteDraft,
  selectQuoteStatus,
} from '../features/quote/quoteSlice'
import {
  getBookedDateKeysForVenue,
  selectVenueBookings,
} from '../features/bookings/bookingSlice'
import { getRoomAvailability, getRoomByName } from '../services/venueAvailability'
import { formatVenueCurrency } from '../utils/currency'
import { getTodayDateKey, normalizeDateKey } from '../utils/dateKeys'
import './style/VenuePage.scss'

interface PaymentSuccessToast {
  venueName: string
  date: string
  email: string
}

interface VenuePageLocationState {
  paymentSuccess?: PaymentSuccessToast
}

export default function VenuePage() {
  const dispatch = useAppDispatch()
  const location = useLocation()
  const quoteDraft = useAppSelector(selectQuoteDraft)
  const quoteFormHandoffKey = useAppSelector(selectQuoteHandoffRequestKey)
  const quoteStatus = useAppSelector(selectQuoteStatus)
  const selectedRoom = useMemo(() => getRoomByName(quoteDraft.roomName), [quoteDraft.roomName])
  const todayDateKey = useMemo(() => getTodayDateKey(), [])
  const bookings = useAppSelector(selectVenueBookings)
  const paymentToast = (location.state as VenuePageLocationState | null)?.paymentSuccess ?? null
  const bookedDates = useMemo(
    () => (selectedRoom ? getBookedDateKeysForVenue(bookings, selectedRoom.id) : []),
    [bookings, selectedRoom],
  )
  const venueOptions = useMemo(
    () =>
      venueSearchResults.map((venue) => ({
        id: venue.id,
        name: venue.name,
        location: venue.location,
        capacity: venue.capacity,
        priceLabel: `${formatVenueCurrency(venue.price_per_day)} / day`,
      })),
    [],
  )

  useEffect(() => {
    if (!quoteFormHandoffKey) {
      return
    }

    document
      .getElementById('quote-request-section')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    document.getElementById('homepage-quote-submit')?.focus({ preventScroll: true })
  }, [quoteFormHandoffKey])

  const handleQuoteFieldChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    if (isQuoteDraftField(name)) {
      dispatch(quoteDraftFieldChanged({ name, value }))

      if (name === 'roomName' && value !== quoteDraft.roomName && quoteDraft.date) {
        dispatch(quoteDraftFieldChanged({ name: 'date', value: '' }))
      }
    }
  }

  const handleVenueSelect = (venueName: string) => {
    dispatch(quoteDraftFieldChanged({ name: 'roomName', value: venueName }))

    if (quoteDraft.date) {
      dispatch(quoteDraftFieldChanged({ name: 'date', value: '' }))
    }
  }

  const handleQuoteDateSelect = (date: string) => {
    if (!selectedRoom) {
      dispatch(quoteStatusSet('Please select a venue before choosing a date.'))
      return
    }

    dispatch(quoteDraftFieldChanged({ name: 'date', value: date }))
  }

  const handleQuoteSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedRoom) {
      dispatch(quoteStatusSet('Please select a venue from the list before choosing a date.'))
      return
    }

    const date = normalizeDateKey(quoteDraft.date)

    if (!date) {
      dispatch(quoteStatusSet('Please choose a date from the booking calendar.'))
      return
    }

    if (date < todayDateKey) {
      dispatch(quoteStatusSet('Please choose today or a future date.'))
      return
    }

    const availability = getRoomAvailability(selectedRoom.name, date)
    if (!availability.success || !availability.available) {
      dispatch(quoteStatusSet(`${availability.message} Quote request was not sent.`))
      return
    }

    if (selectedRoom && bookedDates.includes(date)) {
      dispatch(
        quoteStatusSet(
          `${availability.roomName} is already booked on ${date}. Quote request was not sent.`,
        ),
      )
      return
    }

    dispatch(
      quoteStatusSet(
        `Quote requested for ${availability.roomName} on ${availability.date} by ${quoteDraft.email}.`,
      ),
    )
  }

  return (
    <>
      {/* 1. Sticky navigation */}
      <SiteHeader />

      {/* 2. Full-width hero */}
      <HeroSection />

      {/* 3. Venue cards grid */}
      <GallerySection venues={venueSearchResults} />

      {/* 4. Contact section */}
      <ContactSection />

      {/* 5. Homepage quote form */}
      <QuoteRequestSection
        quoteDraft={quoteDraft}
        quoteStatus={quoteStatus}
        onQuoteFieldChange={handleQuoteFieldChange}
        onQuoteSubmit={handleQuoteSubmit}
        bookedDates={bookedDates}
        calendarEmptyMessage={
          selectedRoom
            ? 'No future dates are open for this venue.'
            : 'Select a venue to see selectable dates.'
        }
        calendarDisabledMessage="Select a venue first to unlock the booking calendar."
        dateMin={todayDateKey}
        isDateSelectionEnabled={Boolean(selectedRoom)}
        onQuoteDateSelect={handleQuoteDateSelect}
        onVenueSelect={handleVenueSelect}
        venueOptions={venueOptions}
      />

      {paymentToast && (
        <div className="venue-toast" role="status" aria-live="polite">
          <strong>Your payment is successful.</strong>
          <span>
            We will shortly send the confirmation document to {paymentToast.email}.
          </span>
        </div>
      )}

      {/* 6. Footer */}
      <SiteFooter />
    </>
  )
}
