import type { VenueSearchResult } from '../../types/venue'
import { formatVenueCurrency } from '../../utils/currency'
import './VenueShowcaseSection.scss'

interface VenueShowcaseSectionProps {
  venue: VenueSearchResult
  onOpenDetails: (venue: VenueSearchResult) => void
  index: number
}

export default function VenueShowcaseSection({
  venue,
  onOpenDetails,
  index,
}: VenueShowcaseSectionProps) {
  const formattedPrice = formatVenueCurrency(venue.price_per_day)

  return (
    <section
      className="venue-showcase"
      id={venue.id}
      aria-labelledby={`showcase-heading-${venue.id}`}
      data-index={index}
    >
      <div className="venue-showcase__inner">
        {/* Header row */}
        <div className="venue-showcase__header">
          <div className="venue-showcase__title-group">
            <h2
              id={`showcase-heading-${venue.id}`}
              className="venue-showcase__name"
            >
              {venue.name.toUpperCase()}
            </h2>
            <div className="venue-showcase__meta" aria-label="Venue details">
              <span className="venue-showcase__location">
                <span aria-hidden="true">📍</span> {venue.location}
              </span>
              <span className="venue-showcase__capacity">
                Up to {venue.capacity} guests
              </span>
            </div>
          </div>

          <div className="venue-showcase__price-badge" aria-label={`Price: ${formattedPrice} per day`}>
            <span className="venue-showcase__price-badge-value">{formattedPrice}</span>
            <span className="venue-showcase__price-badge-label">/ day</span>
          </div>
        </div>

        {/* Description */}
        <p className="venue-showcase__description">{venue.description}</p>

        {/* Specs grid */}
        <dl className="venue-showcase__specs">
          <div className="venue-showcase__spec">
            <dt>Floor Area</dt>
            <dd>{venue.dimensions}</dd>
          </div>
          <div className="venue-showcase__spec">
            <dt>Capacity</dt>
            <dd>{venue.capacity} guests</dd>
          </div>
          <div className="venue-showcase__spec">
            <dt>Next Available</dt>
            <dd>
              {new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: 'numeric',
              }).format(new Date(venue.next_available_date + 'T00:00:00'))}
            </dd>
          </div>
        </dl>

        {/* Image gallery */}
        <ul
          className="venue-showcase__gallery"
          aria-label={`${venue.name} photo gallery`}
        >
          {venue.gallery_images.map((img, i) => (
            <li
              key={img}
              className="venue-showcase__gallery-item"
              style={{
                background: `linear-gradient(${135 + i * 30}deg, rgba(59,29,96,0.88), rgba(76,29,149,0.55))`,
              }}
              aria-label={`${venue.name} — ${img.replace(/\.[^.]+$/, '').replace(/_/g, ' ')}`}
            >
              <span className="venue-showcase__gallery-label">
                {img.replace(/\.[^.]+$/, '').replace(/_/g, ' ')}
              </span>
            </li>
          ))}
        </ul>

        {/* Amenities */}
        <ul
          className="venue-showcase__amenities"
          aria-label={`${venue.name} amenities`}
        >
          {venue.detailed_amenities.map((amenity) => (
            <li key={amenity.id} className="venue-showcase__amenity">
              <span aria-hidden="true">{amenity.icon}</span>
              {amenity.label}
            </li>
          ))}
        </ul>

        {/* Footer CTA */}
        <div className="venue-showcase__footer">
          <div className="venue-showcase__price-row">
            <span className="venue-showcase__price-value">{formattedPrice}</span>
            <span className="venue-showcase__price-unit">per day</span>
          </div>
          <button
            className="venue-showcase__cta"
            type="button"
            onClick={() => onOpenDetails(venue)}
          >
            SEE THE DETAILS
          </button>
        </div>
      </div>
    </section>
  )
}
