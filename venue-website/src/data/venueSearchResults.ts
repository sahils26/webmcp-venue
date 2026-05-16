import type {
  LocalizedVenueSearchResult,
  VenueLocale,
  VenueSearchResult,
  VenueSearchResultCatalog,
  VenueSearchResultTranslation,
} from '../types/venue'
import venueSearchResultCatalogJson from './venueSearchResults.json'

const venueSearchResultCatalog = venueSearchResultCatalogJson as unknown as VenueSearchResultCatalog

function getVenueTranslation(
  venue: LocalizedVenueSearchResult,
  locale: VenueLocale,
): VenueSearchResultTranslation {
  return venue.translations[locale] ?? venue.translations[venueSearchResultCatalog.default_locale]
}

function toVenueSearchResult(
  venue: LocalizedVenueSearchResult,
  locale: VenueLocale,
): VenueSearchResult {
  const translation = getVenueTranslation(venue, locale)

  return {
    id: venue.id,
    name: translation.name,
    capacity: venue.capacity,
    location: translation.location,
    price_per_day: venue.price_per_day,
    thumbnail_url: venue.thumbnail_url,
    top_amenities: venue.top_amenities,
    compact_amenity_labels: translation.compact_amenity_labels,
    next_available_date: venue.next_available_date,
    description: translation.description,
    detailed_amenities: venue.detailed_amenities.map((amenity) => ({
      ...amenity,
      label:
        translation.detailed_amenity_labels[amenity.id] ??
        translation.compact_amenity_labels[amenity.id] ??
        amenity.id,
    })),
    all_available_dates: venue.all_available_dates,
    gallery_images: venue.gallery_images,
    cancellation_policy: translation.cancellation_policy,
    dimensions: venue.dimensions,
  }
}

/**
 * Returns venue search results with locale-specific copy applied.
 */
export function getVenueSearchResults(
  locale: VenueLocale = venueSearchResultCatalog.default_locale,
): VenueSearchResult[] {
  return venueSearchResultCatalog.venues.map((venue) => toVenueSearchResult(venue, locale))
}

/**
 * Locale list shipped by the static venue catalog.
 */
export const supportedVenueLocales = venueSearchResultCatalog.supported_locales

/**
 * Default English venue search results used until language switching is wired in.
 */
export const venueSearchResults = getVenueSearchResults()
