import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAppSelector } from '../app/hooks'
import QuoteForm from '../components/landing/QuoteForm'
import SiteFooter from '../components/landing/SiteFooter'
import SiteHeader from '../components/landing/SiteHeader'
import { venueSearchResults } from '../data/venueSearchResults'
import {
  selectQuoteDraft,
  selectQuoteHandoffRequestKey,
} from '../features/quote/quoteSlice'
import { getRoomAvailability, resolveRoomName } from '../services/venueAvailability'
import type { QuoteDraft, VenueSearchResult } from '../types/venue'
import { formatVenueCurrency } from '../utils/currency'
import { normalizeDateKey } from '../utils/dateKeys'
import './style/VenueDetailPage.scss'

function getTodayDateKey(date = new Date()): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

interface VenueQuotePanelProps {
  venue: VenueSearchResult
}

function VenueQuotePanel({ venue }: VenueQuotePanelProps) {
  const todayDateKey = useMemo(() => getTodayDateKey(), [])
  const preparedQuoteDraft = useAppSelector(selectQuoteDraft)
  const quoteHandoffRequestKey = useAppSelector(selectQuoteHandoffRequestKey)
  const handledHandoffRequestKeyRef = useRef(0)
  const [quoteDraft, setQuoteDraft] = useState<QuoteDraft>({
    roomName: venue.name,
    date: '',
    email: '',
  })
  const [quoteStatus, setQuoteStatus] = useState<string | null>(null)

  useEffect(() => {
    if (
      !quoteHandoffRequestKey ||
      handledHandoffRequestKeyRef.current === quoteHandoffRequestKey ||
      resolveRoomName(preparedQuoteDraft.roomName) !== venue.name
    ) {
      return
    }

    handledHandoffRequestKeyRef.current = quoteHandoffRequestKey
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

  const handleQuoteFieldChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target

    if (name === 'roomName') {
      return
    }

    if (name === 'date' || name === 'email') {
      setQuoteDraft((currentDraft) => ({ ...currentDraft, [name]: value }))
      setQuoteStatus(null)
    }
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

    if (!isValidEmail(email)) {
      setQuoteStatus('Please enter a valid email address for the quote request.')
      return
    }

    const availability = getRoomAvailability(venue.name, date)
    if (!availability.success || !availability.available) {
      setQuoteStatus(`${availability.message} Quote request was not sent.`)
      return
    }

    setQuoteStatus(`Quote requested for ${availability.roomName} on ${date} by ${email}.`)
  }

  return (
    <aside className="venue-detail__booking-panel" aria-label="Quote request">
      <p className="venue-detail__panel-label">Next available</p>
      <p className="venue-detail__panel-date">
        {new Intl.DateTimeFormat('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }).format(new Date(`${venue.next_available_date}T00:00:00`))}
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
          roomLabel="Venue"
          roomReadOnly
          dateMin={todayDateKey}
          dateHelpText="Choose today or a future available event date."
          submitButtonId="detail-quote-submit"
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
          <div>
            <p className="venue-detail__eyebrow">Availability</p>
            <h2 className="venue-detail__section-title">Available Dates</h2>
            <ul className="venue-detail__dates">
              {venue.all_available_dates.map((date) => (
                <li key={date}>
                  {new Intl.DateTimeFormat('en-US', {
                    weekday: 'short',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  }).format(new Date(`${date}T00:00:00`))}
                </li>
              ))}
            </ul>
          </div>

          <VenueQuotePanel key={venue.id} venue={venue} />
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
