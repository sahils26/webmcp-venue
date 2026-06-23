import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import ContactSection from '../components/landing/ContactSection'
import GallerySection from '../components/landing/GallerySection'
import HeroSection from '../components/landing/HeroSection'
import QuoteRequestSection from '../components/landing/QuoteRequestSection'
import SiteFooter from '../components/landing/SiteFooter'
import SiteHeader from '../components/landing/SiteHeader'
import { venueSearchResults } from '../data/venueSearchResults'
import { useCreateQuoteMutation } from '../features/venues/venueApi'
import {
  isQuoteDraftField,
  quoteDraftCleared,
  quoteDraftFieldChanged,
  selectQuoteHandoffRequestKey,
  quoteStatusSet,
  selectQuoteDraft,
  selectQuoteStatus,
} from '../features/quote/quoteSlice'
import { QUOTE_SUCCESS_RESET_DELAY_MS } from '../features/quote/quoteTiming'
import {
  getBookedDateKeysForVenue,
  selectVenueBookings,
  venueQuoteRequested,
} from '../features/bookings/bookingSlice'
import { getRoomAvailability, getRoomByName } from '../services/venueAvailability'
import { getApiErrorMessage } from '../services/api/errorMessage'
import type { VenueSearchResult } from '../types/venue'
import { formatVenueCurrency } from '../utils/currency'
import { getTodayDateKey, normalizeDateKey } from '../utils/dateKeys'
import { isValidEmailAddress } from '../utils/email'
import './style/VenuePage.scss'

interface VenuePageProps {
  venues?: VenueSearchResult[]
}

export default function VenuePage({ venues = venueSearchResults }: VenuePageProps) {
  const dispatch = useAppDispatch()
  const [createQuote] = useCreateQuoteMutation()
  const quoteResetTimerRef = useRef<number | null>(null)
  const quoteDraft = useAppSelector(selectQuoteDraft)
  const quoteFormHandoffKey = useAppSelector(selectQuoteHandoffRequestKey)
  const quoteStatus = useAppSelector(selectQuoteStatus)
  const selectedRoom = useMemo(
    () => getRoomByName(quoteDraft.roomName, venues),
    [quoteDraft.roomName, venues],
  )
  const selectedVenue = useMemo(
    () => venues.find((venue) => venue.id === selectedRoom?.id),
    [selectedRoom?.id, venues],
  )
  const todayDateKey = useMemo(() => getTodayDateKey(), [])
  const bookings = useAppSelector(selectVenueBookings)
  const bookedDates = useMemo(
    () =>
      selectedRoom
        ? Array.from(
            new Set([
              ...(selectedVenue?.blocked_dates ?? []),
              ...getBookedDateKeysForVenue(bookings, selectedRoom.id),
            ]),
          )
        : [],
    [bookings, selectedRoom, selectedVenue?.blocked_dates],
  )
  const venueOptions = useMemo(
    () =>
      venues.map((venue) => ({
        id: venue.id,
        name: venue.name,
        location: venue.location,
        capacity: venue.capacity,
        priceLabel: `${formatVenueCurrency(venue.price_per_day)} / day`,
      })),
    [venues],
  )

  useEffect(() => {
    if (!quoteFormHandoffKey) {
      return
    }

    if (quoteResetTimerRef.current !== null) {
      window.clearTimeout(quoteResetTimerRef.current)
      quoteResetTimerRef.current = null
    }

    document
      .getElementById('quote-request-section')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    document.getElementById('homepage-quote-submit')?.focus({ preventScroll: true })
  }, [quoteFormHandoffKey])

  useEffect(
    () => () => {
      if (quoteResetTimerRef.current !== null) {
        window.clearTimeout(quoteResetTimerRef.current)
      }
    },
    [],
  )

  const cancelScheduledQuoteReset = () => {
    if (quoteResetTimerRef.current !== null) {
      window.clearTimeout(quoteResetTimerRef.current)
      quoteResetTimerRef.current = null
    }
  }

  const handleQuoteFieldChange = (event: ChangeEvent<HTMLInputElement>) => {
    cancelScheduledQuoteReset()
    const { name, value } = event.target
    if (isQuoteDraftField(name)) {
      dispatch(quoteDraftFieldChanged({ name, value }))

      if (name === 'roomName' && value !== quoteDraft.roomName && quoteDraft.date) {
        dispatch(quoteDraftFieldChanged({ name: 'date', value: '' }))
      }
    }
  }

  const handleVenueSelect = (venueName: string) => {
    cancelScheduledQuoteReset()
    dispatch(quoteDraftFieldChanged({ name: 'roomName', value: venueName }))

    if (quoteDraft.date) {
      dispatch(quoteDraftFieldChanged({ name: 'date', value: '' }))
    }
  }

  const handleQuoteDateSelect = (date: string) => {
    cancelScheduledQuoteReset()

    if (!selectedRoom) {
      dispatch(quoteStatusSet('Please select a venue before choosing a date.'))
      return
    }

    dispatch(quoteDraftFieldChanged({ name: 'date', value: date }))
  }

  const handleQuoteSubmit = async (event: FormEvent<HTMLFormElement>) => {
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

    const email = quoteDraft.email.trim()
    if (!isValidEmailAddress(email)) {
      dispatch(quoteStatusSet('Please enter a valid email address for the quote request.'))
      return
    }

    const availability = getRoomAvailability(selectedRoom.name, date, undefined, venues)
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

    try {
      const quote = await createQuote({
        room_name: selectedRoom.name,
        date,
        email,
      }).unwrap()

      dispatch(
        venueQuoteRequested({
          id: String(quote.id),
          venueId: quote.venue_id,
          venueName: selectedRoom.name,
          date: quote.date,
          email: quote.email,
          createdAt: quote.created_at,
        }),
      )
    } catch (error) {
      dispatch(
        quoteStatusSet(
          `${getApiErrorMessage(error, 'Quote request could not be sent.')} Quote request was not sent.`,
        ),
      )
      return
    }
    dispatch(quoteDraftFieldChanged({ name: 'email', value: email }))
    dispatch(
      quoteStatusSet(
        `Quote requested for ${availability.roomName} on ${availability.date} by ${email}. The date is now held.`,
      ),
    )
    cancelScheduledQuoteReset()
    quoteResetTimerRef.current = window.setTimeout(() => {
      dispatch(quoteDraftCleared())
      quoteResetTimerRef.current = null
    }, QUOTE_SUCCESS_RESET_DELAY_MS)
  }

  return (
    <>
      {/* 1. Sticky navigation */}
      <SiteHeader />

      {/* 2. Full-width hero */}
      <HeroSection />

      {/* 3. Venue cards grid */}
      <GallerySection venues={venues} />

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

      {/* 6. Footer */}
      <SiteFooter />
    </>
  )
}
