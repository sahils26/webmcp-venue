import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import QuoteForm from '../components/landing/QuoteForm'
import SiteFooter from '../components/landing/SiteFooter'
import SiteHeader from '../components/landing/SiteHeader'
import { getEventTypeLabel } from '../data/eventTypes'
import { venueSearchResults } from '../data/venueSearchResults'
import {
  getBookedDateKeysForVenue,
  selectVenueBookings,
  venueQuoteRequested,
} from '../features/bookings/bookingSlice'
import { appendStoredVenueBooking } from '../features/bookings/bookingStorage'
import {
  selectQuoteDraft,
  selectQuoteHandoffRequestKey,
} from '../features/quote/quoteSlice'
import { QUOTE_SUCCESS_RESET_DELAY_MS } from '../features/quote/quoteTiming'
import { getRoomAvailability, resolveRoomName } from '../services/venueAvailability'
import type { QuoteDraft, VenueSearchResult } from '../types/venue'
import { formatVenueCurrency } from '../utils/currency'
import { getNextOpenDateKey, getTodayDateKey, normalizeDateKey } from '../utils/dateKeys'
import { isValidEmailAddress } from '../utils/email'
import './style/VenueDetailPage.scss'

const fullDateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
  weekday: 'short',
  year: 'numeric',
})

function formatDate(date: string): string {
  return fullDateFormatter.format(new Date(`${date}T00:00:00Z`))
}

interface VenueBookingHighlightsProps {
  venue: VenueSearchResult
}

function VenueBookingHighlights({ venue }: VenueBookingHighlightsProps) {
  const bookings = useAppSelector(selectVenueBookings)
  const todayDateKey = useMemo(() => getTodayDateKey(), [])
  const bookedDates = useMemo(
    () => getBookedDateKeysForVenue(bookings, venue.id),
    [bookings, venue.id],
  )
  const nextBookableDate = getNextOpenDateKey(bookedDates, todayDateKey)
  const amenityPreview = venue.detailed_amenities.slice(0, 3)

  return (
    <div className="venue-detail__booking-info">
      <div className="venue-detail__section-heading">
        <p className="venue-detail__eyebrow">Booking support</p>
        <h2 className="venue-detail__section-title">Plan With Clear Availability</h2>
      </div>

      <dl className="venue-detail__booking-facts" aria-label={`${venue.name} booking facts`}>
        <div>
          <dt>Next open date</dt>
          <dd>{nextBookableDate ? formatDate(nextBookableDate) : 'No open dates'}</dd>
        </div>
        <div>
          <dt>Capacity</dt>
          <dd>Up to {venue.capacity} guests</dd>
        </div>
        <div>
          <dt>Daily rate</dt>
          <dd>{formatVenueCurrency(venue.price_per_day)}</dd>
        </div>
        <div>
          <dt>Confirmation</dt>
          <dd>Submitting a quote request holds the date for team follow-up.</dd>
        </div>
      </dl>

      <div className="venue-detail__booking-note">
        <h3>Included With This Venue</h3>
        <ul>
          {amenityPreview.map((amenity) => (
            <li key={amenity.id}>
              <span aria-hidden="true">{amenity.icon}</span>
              {amenity.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="venue-detail__blocked-dates" aria-label={`${venue.name} blocked dates`}>
        <h3>Blocked Dates</h3>
        {bookedDates.length ? (
          <ul>
            {bookedDates.map((date) => (
              <li key={date}>{formatDate(date)}</li>
            ))}
          </ul>
        ) : (
          <p>No blocked dates yet.</p>
        )}
      </div>
    </div>
  )
}

interface VenueQuotePanelProps {
  venue: VenueSearchResult
}

function VenueQuotePanel({ venue }: VenueQuotePanelProps) {
  const dispatch = useAppDispatch()
  const todayDateKey = useMemo(() => getTodayDateKey(), [])
  const preparedQuoteDraft = useAppSelector(selectQuoteDraft)
  const quoteHandoffRequestKey = useAppSelector(selectQuoteHandoffRequestKey)
  const bookings = useAppSelector(selectVenueBookings)
  const bookedDates = useMemo(
    () => getBookedDateKeysForVenue(bookings, venue.id),
    [bookings, venue.id],
  )
  const handledHandoffRequestKeyRef = useRef(0)
  const quoteResetTimerRef = useRef<number | null>(null)
  const [quoteDraft, setQuoteDraft] = useState<QuoteDraft>({
    roomName: venue.name,
    date: '',
    email: '',
  })
  const [quoteStatus, setQuoteStatus] = useState<string | null>(null)
  const nextBookableDate = getNextOpenDateKey(bookedDates, todayDateKey)

  useEffect(
    () => () => {
      if (quoteResetTimerRef.current !== null) {
        window.clearTimeout(quoteResetTimerRef.current)
      }
    },
    [],
  )

  useEffect(() => {
    if (
      !quoteHandoffRequestKey ||
      handledHandoffRequestKeyRef.current === quoteHandoffRequestKey ||
      resolveRoomName(preparedQuoteDraft.roomName) !== venue.name
    ) {
      return
    }

    handledHandoffRequestKeyRef.current = quoteHandoffRequestKey
    if (quoteResetTimerRef.current !== null) {
      window.clearTimeout(quoteResetTimerRef.current)
      quoteResetTimerRef.current = null
    }
    setQuoteDraft({
      roomName: venue.name,
      date: preparedQuoteDraft.date,
      email: preparedQuoteDraft.email,
    })
    setQuoteStatus(null)
    document
      .getElementById('venue-detail-quote')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    document.getElementById('detail-quote-submit')?.focus({ preventScroll: true })
  }, [preparedQuoteDraft, quoteHandoffRequestKey, venue.name])

  const cancelScheduledQuoteReset = () => {
    if (quoteResetTimerRef.current !== null) {
      window.clearTimeout(quoteResetTimerRef.current)
      quoteResetTimerRef.current = null
    }
  }

  const handleQuoteFieldChange = (event: ChangeEvent<HTMLInputElement>) => {
    cancelScheduledQuoteReset()
    const { name, value } = event.target

    if (name === 'roomName') {
      return
    }

    if (name === 'date' || name === 'email') {
      setQuoteDraft((currentDraft) => ({ ...currentDraft, [name]: value }))
      setQuoteStatus(null)
    }
  }

  const handleQuoteDateSelect = (date: string) => {
    cancelScheduledQuoteReset()
    setQuoteDraft((currentDraft) => ({ ...currentDraft, date }))
    setQuoteStatus(null)
  }

  const handleQuoteSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const email = quoteDraft.email.trim()
    const date = normalizeDateKey(quoteDraft.date)

    if (!date) {
      setQuoteStatus('Please choose a valid event date.')
      return
    }

    if (date < todayDateKey) {
      setQuoteStatus('Please choose today or a future date.')
      return
    }

    if (!isValidEmailAddress(email)) {
      setQuoteStatus('Please enter a valid email address for the quote request.')
      return
    }

    if (bookedDates.includes(date)) {
      setQuoteStatus(`${venue.name} is already booked on ${date}. Please choose another date.`)
      return
    }

    const availability = getRoomAvailability(venue.name, date)
    if (!availability.success || !availability.available) {
      setQuoteStatus(`${availability.message} Quote request was not sent.`)
      return
    }

    const quoteRequest = {
      id: `${venue.id}-${date}-${Date.now()}`,
      venueId: venue.id,
      venueName: venue.name,
      date,
      email,
      createdAt: new Date().toISOString(),
    }

    appendStoredVenueBooking(quoteRequest)
    dispatch(venueQuoteRequested(quoteRequest))
    setQuoteDraft((currentDraft) => ({ ...currentDraft, email }))
    setQuoteStatus(`Quote requested for ${venue.name} on ${date} by ${email}. The date is now held.`)
    cancelScheduledQuoteReset()
    quoteResetTimerRef.current = window.setTimeout(() => {
      setQuoteDraft({
        roomName: venue.name,
        date: '',
        email: '',
      })
      setQuoteStatus(null)
      quoteResetTimerRef.current = null
    }, QUOTE_SUCCESS_RESET_DELAY_MS)
  }

  return (
    <aside className="venue-detail__booking-panel" aria-label="Quote request">
      <p className="venue-detail__panel-label">Next available</p>
      <p className="venue-detail__panel-date">
        {nextBookableDate ? formatDate(nextBookableDate) : 'No open dates'}
      </p>
      <p className="venue-detail__policy">{venue.cancellation_policy}</p>

      <div className="venue-detail__quote-form" id="venue-detail-quote">
        <h2 className="venue-detail__quote-title">Request a Quote</h2>
        <QuoteForm
          idPrefix="detail-quote"
          quoteDraft={quoteDraft}
          quoteStatus={quoteStatus}
          onQuoteFieldChange={handleQuoteFieldChange}
          onQuoteSubmit={handleQuoteSubmit}
          bookedDates={bookedDates}
          calendarEmptyMessage="No future dates are open for this venue."
          onQuoteDateSelect={handleQuoteDateSelect}
          roomLabel="Venue"
          roomReadOnly
          dateMin={todayDateKey}
          dateHelpText="All future dates are open unless already booked."
          showCalendar
          submitButtonId="detail-quote-submit"
          submitButtonLabel="Submit Quote Request"
          noValidate
        />
      </div>
    </aside>
  )
}

export default function VenueDetailPage() {
  const { venueId } = useParams()
  const venue = venueSearchResults.find((candidate) => candidate.id === venueId)

  if (!venue) {
    return (
      <>
        <SiteHeader />
        <main className="venue-detail venue-detail--missing">
          <div className="venue-detail__missing">
            <p className="venue-detail__eyebrow">Venue not found</p>
            <h1 className="venue-detail__title">This space is no longer available.</h1>
            <p className="venue-detail__intro">
              Browse the current venue collection and choose another space for your event.
            </p>
            <Link className="venue-detail__primary-action" to="/#venues">
              Browse Spaces
            </Link>
          </div>
        </main>
        <SiteFooter />
      </>
    )
  }

  const formattedPrice = formatVenueCurrency(venue.price_per_day)

  return (
    <>
      <SiteHeader />
      <main className="venue-detail">
        <section className="venue-detail__hero" aria-labelledby="venue-detail-title">
          <div className="venue-detail__hero-media">
            <img
              className="venue-detail__hero-image"
              src={venue.thumbnail_url}
              alt={`${venue.name} — main view`}
            />
          </div>

          <div className="venue-detail__hero-content">
            <Link className="venue-detail__back-link" to="/#venues">
              Browse all spaces
            </Link>
            <p className="venue-detail__eyebrow">{venue.location}</p>
            <h1 id="venue-detail-title" className="venue-detail__title">
              {venue.name}
            </h1>
            <p className="venue-detail__intro">{venue.description}</p>

            <dl className="venue-detail__quick-facts" aria-label={`${venue.name} key facts`}>
              <div>
                <dt>Capacity</dt>
                <dd>Up to {venue.capacity} guests</dd>
              </div>
              <div>
                <dt>Price</dt>
                <dd>{formattedPrice} / day</dd>
              </div>
              <div>
                <dt>Floor Area</dt>
                <dd>{venue.dimensions}</dd>
              </div>
            </dl>

            {venue.event_types.length > 0 && (
              <div className="venue-detail__event-types" aria-label={`${venue.name} ideal event types`}>
                <p className="venue-detail__event-types-label">Ideal for</p>
                <ul className="venue-detail__event-types-tags">
                  {venue.event_types.map((eventTypeId) => (
                    <li key={eventTypeId} className="venue-detail__event-type-tag">
                      {getEventTypeLabel(eventTypeId)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        <section className="venue-detail__section" aria-labelledby="venue-amenities-title">
          <div className="venue-detail__section-heading">
            <p className="venue-detail__eyebrow">Facilities</p>
            <h2 id="venue-amenities-title" className="venue-detail__section-title">
              What This Space Includes
            </h2>
          </div>

          <ul className="venue-detail__amenities" aria-label={`${venue.name} amenities`}>
            {venue.detailed_amenities.map((amenity) => (
              <li key={amenity.id} className="venue-detail__amenity">
                <span className="venue-detail__amenity-icon" aria-hidden="true">
                  {amenity.icon}
                </span>
                <span>{amenity.label}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="venue-detail__section" aria-labelledby="venue-gallery-title">
          <div className="venue-detail__section-heading">
            <p className="venue-detail__eyebrow">Gallery</p>
            <h2 id="venue-gallery-title" className="venue-detail__section-title">
              Space Preview
            </h2>
          </div>

          <ul className="venue-detail__gallery" aria-label={`${venue.name} photo gallery`}>
            {venue.gallery_images.map((image, index) => (
              <li key={image} className="venue-detail__gallery-item">
                <img
                  className="venue-detail__gallery-image"
                  src={image}
                  alt={`${venue.name} — gallery image ${index + 1}`}
                />
              </li>
            ))}
          </ul>
        </section>

        <section className="venue-detail__section venue-detail__section--split">
          <VenueBookingHighlights venue={venue} />

          <VenueQuotePanel key={venue.id} venue={venue} />
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
