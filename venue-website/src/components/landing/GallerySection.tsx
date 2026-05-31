import { type ChangeEvent, type MouseEvent, useMemo, useState } from 'react'
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

interface AmenityFilterOption {
  id: string
  label: string
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
              <svg
                className="gallery-card__carousel-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              className="gallery-card__carousel-button gallery-card__carousel-button--next"
              type="button"
              onClick={handleNextImage}
              aria-label={`Show next image for ${venue.name}`}
              title="Next image"
            >
              <svg
                className="gallery-card__carousel-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
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

function getAmenityOptions(venues: VenueSearchResult[]): AmenityFilterOption[] {
  const amenityOptions = new Map<string, string>()

  venues.forEach((venue) => {
    venue.detailed_amenities.forEach((amenity) => {
      if (amenityOptions.has(amenity.id)) {
        return
      }

      amenityOptions.set(
        amenity.id,
        venue.compact_amenity_labels[amenity.id] ?? amenity.label,
      )
    })
  })

  return Array.from(amenityOptions, ([id, label]) => ({ id, label })).sort((a, b) =>
    a.label.localeCompare(b.label),
  )
}

export default function GallerySection({ venues }: GallerySectionProps) {
  const [selectedVenueId, setSelectedVenueId] = useState('')
  const [guestCount, setGuestCount] = useState('')
  const [selectedAmenityIds, setSelectedAmenityIds] = useState<string[]>([])

  const amenityOptions = useMemo(() => getAmenityOptions(venues), [venues])
  const selectedAmenitySet = useMemo(() => new Set(selectedAmenityIds), [selectedAmenityIds])
  const guestCountValue = Number(guestCount)
  const hasGuestCountFilter = Number.isFinite(guestCountValue) && guestCountValue > 0

  const filteredVenues = useMemo(
    () =>
      venues.filter((venue) => {
        const matchesVenueName = selectedVenueId ? venue.id === selectedVenueId : true
        const matchesGuestCount = hasGuestCountFilter
          ? venue.capacity >= guestCountValue
          : true
        const venueAmenityIds = new Set(venue.detailed_amenities.map((amenity) => amenity.id))
        const matchesAmenities = selectedAmenityIds.every((amenityId) =>
          venueAmenityIds.has(amenityId),
        )

        return matchesVenueName && matchesGuestCount && matchesAmenities
      }),
    [
      guestCountValue,
      hasGuestCountFilter,
      selectedAmenityIds,
      selectedVenueId,
      venues,
    ],
  )

  const hasActiveFilters =
    Boolean(selectedVenueId) || Boolean(guestCount) || selectedAmenityIds.length > 0
  const resultSummary =
    filteredVenues.length === venues.length
      ? `${venues.length} curated venues in Jena, Germany`
      : `Showing ${filteredVenues.length} of ${venues.length} curated venues`

  const handleGuestCountChange = (event: ChangeEvent<HTMLInputElement>) => {
    setGuestCount(event.target.value)
  }

  const handleAmenityChange = (amenityId: string) => {
    setSelectedAmenityIds((currentAmenityIds) =>
      currentAmenityIds.includes(amenityId)
        ? currentAmenityIds.filter((selectedAmenityId) => selectedAmenityId !== amenityId)
        : [...currentAmenityIds, amenityId],
    )
  }

  const handleResetFilters = () => {
    setSelectedVenueId('')
    setGuestCount('')
    setSelectedAmenityIds([])
  }

  return (
    <section className="gallery-section" id="venues" aria-labelledby="gallery-title">
      <div className="gallery-section__inner">
        <div className="gallery-section__heading-row">
          <h2 id="gallery-title" className="gallery-section__title">
            EXPLORE ALL SPACES
          </h2>
          <p className="gallery-section__subtitle" aria-live="polite">
            {resultSummary}
          </p>
        </div>

        <div className="gallery-section__filter-panel" aria-label="Filter venues">
          <div className="gallery-section__filter-grid">
            <label className="gallery-section__field" htmlFor="venue-filter-name">
              <span>Venue name</span>
              <select
                id="venue-filter-name"
                value={selectedVenueId}
                onChange={(event) => setSelectedVenueId(event.target.value)}
              >
                <option value="">All venues</option>
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="gallery-section__field" htmlFor="venue-filter-guests">
              <span>Number of people</span>
              <input
                id="venue-filter-guests"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={guestCount}
                onChange={handleGuestCountChange}
                placeholder="e.g. 100"
              />
            </label>
          </div>

          <fieldset className="gallery-section__amenity-field">
            <legend>Amenities</legend>
            <div className="gallery-section__amenity-options">
              {amenityOptions.map((amenity) => (
                <label
                  className={`gallery-section__amenity-option${
                    selectedAmenitySet.has(amenity.id)
                      ? ' gallery-section__amenity-option--selected'
                      : ''
                  }`}
                  key={amenity.id}
                >
                  <input
                    type="checkbox"
                    checked={selectedAmenitySet.has(amenity.id)}
                    onChange={() => handleAmenityChange(amenity.id)}
                  />
                  <span>{amenity.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="gallery-section__filter-actions">
            <p aria-live="polite">
              {filteredVenues.length} {filteredVenues.length === 1 ? 'venue' : 'venues'} match
              your filters
            </p>
            <button type="button" onClick={handleResetFilters} disabled={!hasActiveFilters}>
              Reset filters
            </button>
          </div>
        </div>

        {filteredVenues.length > 0 ? (
          <ul className="gallery-section__grid" aria-label="All venues">
            {filteredVenues.map((venue) => (
              <li key={venue.id}>
                <VenueGalleryCard venue={venue} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="gallery-section__empty" role="status">
            <h3>No venues match these filters</h3>
            <p>Adjust the guest count, venue name, or amenities to broaden the results.</p>
          </div>
        )}
      </div>
    </section>
  )
}
