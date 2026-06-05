import { type ChangeEvent, type FormEvent, useEffect } from 'react'
import type { QuoteDraft, VenueSearchResult } from '../../types/venue'
import { formatVenueCurrency } from '../../utils/currency'
import QuoteForm from './QuoteForm'
import './VenueDetailsModal.scss'

interface VenueDetailsModalProps {
  venue: VenueSearchResult | null
  onClose: () => void
  quoteDraft: QuoteDraft
  quoteStatus: string | null
  onQuoteFieldChange: (event: ChangeEvent<HTMLInputElement>) => void
  onQuoteSubmit: (event: FormEvent<HTMLFormElement>) => void
  onCheckAvailability: (venueName: string) => void
}

export default function VenueDetailsModal({
  venue,
  onClose,
  quoteDraft,
  quoteStatus,
  onQuoteFieldChange,
  onQuoteSubmit,
  onCheckAvailability,
}: VenueDetailsModalProps) {
  // Keyboard handler — Escape closes the modal
  useEffect(() => {
    if (!venue) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [venue, onClose])

  if (!venue) return null

  const formattedPrice = formatVenueCurrency(venue.price_per_day)

  return (
    <div
      className="venue-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="venue-modal-title"
    >
      {/* Backdrop */}
      <div
        className="venue-modal__backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="venue-modal__panel">
        {/* Sticky close button */}
        <button
          className="venue-modal__close"
          type="button"
          onClick={onClose}
          aria-label="Close venue details"
          autoFocus
        >
          &times;
        </button>

        <div className="venue-modal__body">
          {/* Hero header */}
          <div className="venue-modal__hero">
            <div>
              <h2 id="venue-modal-title" className="venue-modal__title">
                {venue.name}
              </h2>
              <p className="venue-modal__location">
                <span aria-hidden="true">📍</span> {venue.location}
              </p>
            </div>
            <div className="venue-modal__price-badge" aria-label={`${formattedPrice} per day`}>
              <span className="venue-modal__price-badge-value">{formattedPrice}</span>
              <span className="venue-modal__price-badge-label">/ day</span>
            </div>
          </div>

          {/* Gallery */}
          <ul
            className="venue-modal__gallery"
            aria-label={`${venue.name} photo gallery`}
          >
            {venue.gallery_images.map((img, i) => (
              <li
                key={img}
                className="venue-modal__gallery-item"
                style={{
                  background: `linear-gradient(${145 + i * 25}deg, rgba(59,29,96,0.9), rgba(76,29,149,0.55))`,
                }}
                aria-label={`${venue.name} — ${img.replace(/\.[^.]+$/, '').replace(/_/g, ' ')}`}
              >
                <span className="venue-modal__gallery-label">
                  {img.replace(/\.[^.]+$/, '').replace(/_/g, ' ')}
                </span>
              </li>
            ))}
          </ul>

          {/* Description */}
          <section aria-labelledby="modal-about-title" className="venue-modal__section">
            <h3 id="modal-about-title" className="venue-modal__section-title">About This Space</h3>
            <p className="venue-modal__description">{venue.description}</p>
          </section>

          {/* Specs */}
          <dl className="venue-modal__specs">
            <div className="venue-modal__spec">
              <dt>Floor Area</dt>
              <dd>{venue.dimensions}</dd>
            </div>
            <div className="venue-modal__spec">
              <dt>Capacity</dt>
              <dd>{venue.capacity} guests</dd>
            </div>
            <div className="venue-modal__spec">
              <dt>Price</dt>
              <dd>{formattedPrice} / day</dd>
            </div>
          </dl>

          {/* Amenities */}
          <section aria-labelledby="modal-amenities-title" className="venue-modal__section">
            <h3 id="modal-amenities-title" className="venue-modal__section-title">Amenities</h3>
            <ul className="venue-modal__amenities">
              {venue.detailed_amenities.map((amenity) => (
                <li key={amenity.id} className="venue-modal__amenity">
                  <span className="venue-modal__amenity-icon" aria-hidden="true">
                    {amenity.icon}
                  </span>
                  {amenity.label}
                </li>
              ))}
            </ul>
          </section>

          {/* Booking details */}
          <section aria-labelledby="modal-booking-title" className="venue-modal__section">
            <h3 id="modal-booking-title" className="venue-modal__section-title">
              Booking Details
            </h3>
            <dl className="venue-modal__booking-details">
              <div>
                <dt>Calendar</dt>
                <dd>All future dates are open unless already booked.</dd>
              </div>
              <div>
                <dt>Confirmation</dt>
                <dd>Payment locks the date and sends the confirmation document by email.</dd>
              </div>
            </dl>
          </section>

          {/* Cancellation policy */}
          <p className="venue-modal__policy">
            <strong>Cancellation Policy:</strong> {venue.cancellation_policy}
          </p>

          {/* Action buttons */}
          <div className="venue-modal__actions">
            <button
              type="button"
              className="venue-modal__action venue-modal__action--primary"
              onClick={() => onCheckAvailability(venue.name)}
            >
              Check Availability
            </button>
            <button
              type="button"
              className="venue-modal__action venue-modal__action--outline"
              onClick={() =>
                document.getElementById('modal-quote-section')?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              Request a Quote
            </button>
          </div>

          {/* Quote form */}
          <section
            id="modal-quote-section"
            aria-labelledby="modal-quote-title"
            className="venue-modal__section venue-modal__quote-section"
          >
            <h3 id="modal-quote-title" className="venue-modal__section-title">
              Request a Quote
            </h3>
            <p className="venue-modal__quote-note">
              The AI assistant can fill this form automatically. You must click Submit to send.
            </p>

            <QuoteForm
              idPrefix="modal-quote"
              quoteDraft={quoteDraft}
              quoteStatus={quoteStatus}
              onQuoteFieldChange={onQuoteFieldChange}
              onQuoteSubmit={onQuoteSubmit}
            />
          </section>
        </div>
      </div>
    </div>
  )
}
