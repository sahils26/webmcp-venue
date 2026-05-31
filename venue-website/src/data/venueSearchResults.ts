import type {
  LocalizedVenueSearchResult,
  VenueLocale,
  VenueSearchResult,
  VenueSearchResultCatalog,
  VenueSearchResultTranslation,
} from '../types/venue'
import venueSearchResultCatalogJson from './venueSearchResults.json'

import grandHallEntrance from '../assets/images/THE GRAND HALL - Entrance.png'
import grandHallSeating from '../assets/images/THE GRAND HALL - Seating View.png'
import grandHallStage from '../assets/images/THE GRAND HALL - Stage View.png'
import skylineLoftEntrance from '../assets/images/SKYLINE LOFT - Entrance.png'
import skylineLoftSeating from '../assets/images/SKYLINE LOFT - Seating Layout.png'
import skylineLoftStage from '../assets/images/SKYLINE LOFT - Stage View.png'
import atelierCourtyardEntrance from '../assets/images/ATELIER COURTYARD - Entrance.png'
import atelierCourtyardSeating from '../assets/images/ATELIER COURTYARD - Seating Layout.png'
import atelierCourtyardStage from '../assets/images/ATELIER COURTYARD - Stage View.png'
import riverSuiteEntrance from '../assets/images/RIVER CONFERENCE SUITE - Entrance.png'
import riverSuiteSeating from '../assets/images/RIVER CONFERENCE SUITE - Seating Layout.png'
import riverSuiteStage from '../assets/images/RIVER CONFERENCE SUITE - Stage View.png'
import gardenPavilionEntrance from '../assets/images/GARDEN PAVILION - Entrance.png'
import gardenPavilionSeating from '../assets/images/GARDEN PAVILION - Seating Layout.png'
import gardenPavilionStage from '../assets/images/GARDEN PAVILION - Stage View.png'

const venueImages: Record<string, { thumbnail: string; gallery: string[] }> = {
  'grand-hall': {
    thumbnail: grandHallEntrance,
    gallery: [grandHallStage, grandHallSeating],
  },
  'skyline-loft': {
    thumbnail: skylineLoftEntrance,
    gallery: [skylineLoftStage, skylineLoftSeating],
  },
  'atelier-courtyard': {
    thumbnail: atelierCourtyardEntrance,
    gallery: [atelierCourtyardStage, atelierCourtyardSeating],
  },
  'river-conference-suite': {
    thumbnail: riverSuiteEntrance,
    gallery: [riverSuiteStage, riverSuiteSeating],
  },
  'garden-pavilion': {
    thumbnail: gardenPavilionEntrance,
    gallery: [gardenPavilionStage, gardenPavilionSeating],
  },
}

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
  const images = venueImages[venue.id]

  return {
    id: venue.id,
    name: translation.name,
    capacity: venue.capacity,
    location: translation.location,
    price_per_day: venue.price_per_day,
    thumbnail_url: images?.thumbnail ?? venue.thumbnail_url,
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
    gallery_images: images?.gallery ?? venue.gallery_images,
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
