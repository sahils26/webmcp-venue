import { type MouseEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { VenueSearchResult } from '../../types/venue'
import { formatVenueCurrency } from '../../utils/currency'
import './GallerySection.scss'

interface GallerySectionProps {
  venues: VenueSearchResult[]
}

interface VenueGalleryCardProps {
  venue: VenueSearchResult
}

function VenueGalleryCard({ venue }: VenueGalleryCardProps) {
  const navigate = useNavigate()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const images = [venue.thumbnail_url, ...venue.gallery_images].filter(Boolean)
  const totalImages = images.length || 1
  const hasMultipleImages = images.length > 1
  const currentImage = images[currentImageIndex] ?? venue.name
  const detailsPath = `/venues/${venue.id}`

  const handleCardClick = (event: MouseEvent<HTMLElement>) => {
    if (event.target instanceof Element && event.target.closest('a, button')) {
      return
    }

    navigate(detailsPath)
  }

  const handlePreviousImage = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setCurrentImageIndex((index) => (index - 1 + totalImages) % totalImages)
  }

  const handleNextImage = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setCurrentImageIndex((index) => (index + 1) % totalImages)
  }

  return (
    <article
      className="gallery-card"
      aria-label={`${venue.name} venue card`}
      onClick={handleCardClick}
    >
      <div
        className="gallery-card__carousel"
        role="group"
        aria-label={`${venue.name} image carousel`}
        aria-roledescription="carousel"
      >
        <img
          className="gallery-card__image"
          src={currentImage}
          alt={`${venue.name}, image ${currentImageIndex + 1} of ${totalImages}`}
        />
        <div className="gallery-card__image-overlay" aria-hidden="true">
          <span className="gallery-card__image-label">{venue.name}</span>
        </div>

        {hasMultipleImages && (
          <>
            <button
              className="gallery-card__carousel-button gallery-card__carousel-button--previous"
              type="button"
              onClick={handlePreviousImage}
              aria-label={`Show previous image for ${venue.name}`}
              title="Previous image"
            >
              <span aria-hidden="true">{'<'}</span>
            </button>
            <button
              className="gallery-card__carousel-button gallery-card__carousel-button--next"
              type="button"
              onClick={handleNextImage}
              aria-label={`Show next image for ${venue.name}`}
              title="Next image"
            >
              <span aria-hidden="true">{'>'}</span>
            </button>
            <div className="gallery-card__carousel-progress" aria-hidden="true">
              {images.map((image, imageIndex) => (
                <span
                  className={`gallery-card__carousel-dot${
                    imageIndex === currentImageIndex
                      ? ' gallery-card__carousel-dot--active'
                      : ''
                  }`}
                  key={image}
                />
              ))}
            </div>
          </>
        )}

        <span className="gallery-card__image-count" aria-live="polite">
          {currentImageIndex + 1} / {totalImages}
        </span>
      </div>

      <div className="gallery-card__body">
        <div className="gallery-card__meta">
          <h3 className="gallery-card__name">{venue.name}</h3>
          <span className="gallery-card__location">
            <span aria-hidden="true">📍</span> {venue.location}
          </span>
        </div>

        <div className="gallery-card__details">
          <span className="gallery-card__capacity">Up to {venue.capacity} guests</span>
          <span className="gallery-card__price">
            {formatVenueCurrency(venue.price_per_day)} / day
          </span>
        </div>

        <Link
          to={detailsPath}
          className="gallery-card__cta"
          aria-label={`View details for ${venue.name}`}
          onClick={(event) => event.stopPropagation()}
        >
          View Details
        </Link>
      </div>
    </article>
  )
}

export default function GallerySection({ venues }: GallerySectionProps) {
  return (
    <section className="gallery-section" id="venues" aria-labelledby="gallery-title">
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
          {venues.map((venue) => (
            <li key={venue.id}>
              <VenueGalleryCard venue={venue} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
