import { useState, type ReactNode } from 'react'
import type { VenueSearchResult } from '../types/venue'
import './style/VenueSearchCard.scss'

interface VenueSearchCardProps {
  venue: VenueSearchResult
}

interface IconProps {
  className?: string
}

type IconComponent = (props: IconProps) => ReactNode

const currencyFormatter = new Intl.NumberFormat('en-US', {
  currency: 'EUR',
  maximumFractionDigits: 0,
  style: 'currency',
})

const compactDateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
  year: 'numeric',
})

const longDateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
  weekday: 'long',
  year: 'numeric',
})

function formatDate(date: string, formatter: Intl.DateTimeFormat): string {
  return formatter.format(new Date(`${date}T00:00:00Z`))
}

function formatAmenityLabel(amenity: string): string {
  return amenity
    .split('-')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}

function ProjectorIcon({ className }: IconProps) {
  return (
    <svg className={className} aria-hidden="true" viewBox="0 0 24 24">
      <rect x="4" y="7" width="16" height="10" rx="2.5" />
      <path d="M8 17v2" />
      <path d="M16 17v2" />
      <circle cx="17" cy="12" r="1.5" />
      <path d="M7.5 11h5" />
    </svg>
  )
}

function CateringIcon({ className }: IconProps) {
  return (
    <svg className={className} aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="6.5" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M4 4v7" />
      <path d="M7 4v7" />
      <path d="M4 7h3" />
      <path d="M20 4v16" />
    </svg>
  )
}

function ParkingIcon({ className }: IconProps) {
  return (
    <svg className={className} aria-hidden="true" viewBox="0 0 24 24">
      <rect x="5" y="4" width="14" height="16" rx="3" />
      <path d="M10 16V8h3.25a2.75 2.75 0 0 1 0 5.5H10" />
    </svg>
  )
}

function WifiIcon({ className }: IconProps) {
  return (
    <svg className={className} aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 9.5a11 11 0 0 1 14 0" />
      <path d="M8 13a6.5 6.5 0 0 1 8 0" />
      <path d="M11 16.5a2 2 0 0 1 2 0" />
      <path d="M12 19h.01" />
    </svg>
  )
}

function MapPinIcon({ className }: IconProps) {
  return (
    <svg className={className} aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 21s7-5.3 7-11a7 7 0 1 0-14 0c0 5.7 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}

function ChevronDownIcon({ className }: IconProps) {
  return (
    <svg className={className} aria-hidden="true" viewBox="0 0 24 24">
      <path d="m7 10 5 5 5-5" />
    </svg>
  )
}

function ChevronUpIcon({ className }: IconProps) {
  return (
    <svg className={className} aria-hidden="true" viewBox="0 0 24 24">
      <path d="m7 14 5-5 5 5" />
    </svg>
  )
}

const amenityIcons: Record<string, { Icon: IconComponent; label: string }> = {
  catering: { Icon: CateringIcon, label: 'Catering' },
  parking: { Icon: ParkingIcon, label: 'Parking' },
  projector: { Icon: ProjectorIcon, label: 'Projector' },
  wifi: { Icon: WifiIcon, label: 'Wi-Fi' },
}

/**
 * Reusable venue result card with compact and expanded presentation states.
 */
export default function VenueSearchCard({ venue }: VenueSearchCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const detailsId = `${venue.id}-details`
  const formattedPrice = currencyFormatter.format(venue.price_per_day)
  const nextAvailableDate = formatDate(venue.next_available_date, compactDateFormatter)

  return (
    <article className={`venue-search-card ${isExpanded ? 'venue-search-card--expanded' : ''}`}>
      <div className="venue-search-card__summary">
        <div
          className="venue-search-card__media"
          role="img"
          aria-label={`${venue.name} thumbnail`}
          style={{
            backgroundImage: `linear-gradient(135deg, rgba(59, 29, 96, 0.9), rgba(76, 29, 149, 0.72)), url(${venue.thumbnail_url})`,
          }}
        >
          <span>{venue.name.charAt(0)}</span>
        </div>

        <div className="venue-search-card__main">
          <div className="venue-search-card__header-row">
            <h3 className="venue-search-card__name">{venue.name}</h3>
            <span className="venue-search-card__capacity">{venue.capacity} guests</span>
          </div>

          <p className="venue-search-card__location">
            <MapPinIcon className="venue-search-card__meta-icon" />
            <span>{venue.location}</span>
          </p>

          <dl className="venue-search-card__price-row">
            <div>
              <dt>Price per day</dt>
              <dd>{formattedPrice}</dd>
            </div>
          </dl>

          <ul className="venue-search-card__amenities" aria-label={`${venue.name} top amenities`}>
            {venue.top_amenities.map((amenity) => {
              const amenityInfo = amenityIcons[amenity]
              const Icon = amenityInfo?.Icon ?? WifiIcon

              return (
                <li key={amenity}>
                  <Icon className="venue-search-card__amenity-icon" />
                  <span>
                    {venue.compact_amenity_labels[amenity] ??
                      amenityInfo?.label ??
                      formatAmenityLabel(amenity)}
                  </span>
                </li>
              )
            })}
          </ul>

          <div className="venue-search-card__bottom-row">
            <p className="venue-search-card__next-date">
              <span>Next Available:</span> {nextAvailableDate}
            </p>

            {!isExpanded && (
              <button
                className="venue-search-card__ghost-action"
                type="button"
                aria-expanded={isExpanded}
                aria-controls={detailsId}
                onClick={() => setIsExpanded(true)}
              >
                <span>View Details</span>
                <ChevronDownIcon className="venue-search-card__button-icon" />
              </button>
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="venue-search-card__details" id={detailsId}>
          <section className="venue-search-card__section" aria-labelledby={`${venue.id}-about`}>
            <div className="venue-search-card__section-heading">
              <h4 id={`${venue.id}-about`}>About the Venue</h4>
              <span>{venue.dimensions}</span>
            </div>
            <p>{venue.description}</p>
          </section>

          <section className="venue-search-card__section" aria-labelledby={`${venue.id}-amenities`}>
            <h4 id={`${venue.id}-amenities`}>Included Amenities</h4>
            <ul className="venue-search-card__detail-pills">
              {venue.detailed_amenities.map((amenity) => (
                <li key={amenity.id}>
                  <span aria-hidden="true">{amenity.icon}</span>
                  {amenity.label}
                </li>
              ))}
            </ul>
          </section>

          <section className="venue-search-card__section" aria-labelledby={`${venue.id}-dates`}>
            <h4 id={`${venue.id}-dates`}>Full Availability Calendar</h4>
            <ul className="venue-search-card__dates">
              {venue.all_available_dates.map((date) => (
                <li key={date}>
                  <span aria-hidden="true">🗓️</span>
                  {formatDate(date, longDateFormatter)}
                </li>
              ))}
            </ul>
          </section>

          <section className="venue-search-card__section" aria-labelledby={`${venue.id}-photos`}>
            <h4 id={`${venue.id}-photos`}>Additional Photos</h4>
            <ul className="venue-search-card__photos">
              {venue.gallery_images.map((image) => (
                <li
                  key={image}
                  aria-label={`${venue.name} gallery image ${image}`}
                  style={{
                    backgroundImage: `linear-gradient(135deg, rgba(59, 29, 96, 0.84), rgba(76, 29, 149, 0.54)), url(${image})`,
                  }}
                />
              ))}
            </ul>
          </section>

          <p className="venue-search-card__policy">{venue.cancellation_policy}</p>

          <button
            className="venue-search-card__solid-action"
            type="button"
            aria-expanded={isExpanded}
            aria-controls={detailsId}
            onClick={() => setIsExpanded(false)}
          >
            <span>Close Details</span>
            <ChevronUpIcon className="venue-search-card__button-icon" />
          </button>
        </div>
      )}
    </article>
  )
}
