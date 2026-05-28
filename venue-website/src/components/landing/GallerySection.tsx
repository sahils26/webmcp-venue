import type { VenueSearchResult } from '../../types/venue'
import { formatVenueCurrency } from '../../utils/currency'
import './GallerySection.scss'

interface GallerySectionProps {
  venues: VenueSearchResult[]
  onOpenDetails: (venue: VenueSearchResult) => void
}

export default function GallerySection({ venues, onOpenDetails }: GallerySectionProps) {
  return (
    <section className="gallery-section" aria-labelledby="gallery-title">
      <div className="gallery-section__inner">
        <div className="gallery-section__heading-row">
          <h2 id="gallery-title" className="gallery-section__title">
            EXPLORE ALL SPACES
          </h2>
          <p className="gallery-section__subtitle">
            {venues.length} curated venues across central Germany
          </p>
        </div>

        {/* Filter pills — visual only in v1 */}
        <div className="gallery-section__filters" role="group" aria-label="Filter venues">
          <button
            type="button"
            className="gallery-section__filter gallery-section__filter--active"
          >
            ALL
          </button>
          <button type="button" className="gallery-section__filter">
            CONFERENCE
          </button>
          <button type="button" className="gallery-section__filter">
            CREATIVE
          </button>
          <button type="button" className="gallery-section__filter">
            OUTDOOR
          </button>
        </div>

        {/* Venue cards grid */}
        <ul className="gallery-section__grid" aria-label="All venues">
          {venues.map((venue, i) => (
            <li key={venue.id} className="gallery-card">
              {/* Gradient image block */}
              <div
                className="gallery-card__image"
                style={{
                  background: `linear-gradient(${140 + i * 28}deg, rgba(59,29,96,0.9), rgba(76,29,149,0.5))`,
                }}
                aria-hidden="true"
              >
                <span className="gallery-card__image-label">{venue.name}</span>
              </div>

              {/* Card body */}
              <div className="gallery-card__body">
                <div className="gallery-card__meta">
                  <h3 className="gallery-card__name">{venue.name}</h3>
                  <span className="gallery-card__location">
                    <span aria-hidden="true">📍</span> {venue.location}
                  </span>
                </div>

                <div className="gallery-card__details">
                  <span className="gallery-card__capacity">
                    Up to {venue.capacity} guests
                  </span>
                  <span className="gallery-card__price">
                    {formatVenueCurrency(venue.price_per_day)} / day
                  </span>
                </div>

                <button
                  type="button"
                  className="gallery-card__cta"
                  onClick={() => onOpenDetails(venue)}
                >
                  View Details
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
