import { venueSearchResults } from '../data/venueSearchResults'
import type { RoomAvailabilityResult, VenueRoom, VenueSearchResult } from '../types/venue'
import { formatVenueCurrency, VENUE_CURRENCY_CODE } from '../utils/currency'
import { normalizeDateKey } from '../utils/dateKeys'

type CapacitySearch = {
  guestCount: number | null
  minCapacity: number | null
  maxCapacity: number | null
  inferredFromText: boolean
}

type VenueSearchCriteria = {
  query: string
  eventType: string
  details: string
  date: string
  requiredAmenities: string[]
  capacity: CapacitySearch
}

type ScoredVenue = {
  venue: VenueSearchResult
  exact: boolean
  score: number
  matchedAmenities: string[]
  matchedTerms: string[]
  capacityDistance: number
}

const AMENITY_ALIASES: Record<string, string> = {
  audio: 'projector',
  av: 'projector',
  beamer: 'projector',
  catering: 'catering',
  dinner: 'catering',
  food: 'catering',
  garden: 'outdoor',
  internet: 'wifi',
  outdoor: 'outdoor',
  outside: 'outdoor',
  parking: 'parking',
  projector: 'projector',
  screen: 'projector',
  stage: 'stage',
  terrace: 'outdoor',
  wifi: 'wifi',
  wireless: 'wifi',
}

const EVENT_TYPE_HINTS: Record<string, string[]> = {
  celebration: ['reception', 'catering', 'team', 'dinner'],
  conference: ['conference', 'summit', 'sessions', 'presentation', 'projector', 'wifi'],
  corporate: ['corporate', 'networking', 'presentation', 'conference', 'offsite'],
  dinner: ['dinner', 'catering', 'reception', 'hospitality'],
  gala: ['gala', 'networking', 'stage', 'catering'],
  launch: ['launch', 'presentation', 'modular', 'projector'],
  meeting: ['meeting', 'conference', 'leadership', 'wifi'],
  networking: ['networking', 'gala', 'reception', 'corporate'],
  offsite: ['offsite', 'workshop', 'lounge', 'presentation'],
  party: ['celebration', 'reception', 'catering', 'stage'],
  reception: ['reception', 'catering', 'outdoor', 'dinner'],
  seminar: ['conference', 'presentation', 'projector', 'wifi'],
  summit: ['summit', 'leadership', 'conference', 'sessions'],
  training: ['workshop', 'presentation', 'projector', 'wifi'],
  wedding: ['reception', 'dinner', 'catering', 'outdoor', 'garden', 'hall'],
  workshop: ['workshop', 'creative', 'briefing', 'sprint', 'modular'],
}

const STOP_WORDS = new Set([
  'a',
  'and',
  'about',
  'accommodate',
  'accomodate',
  'around',
  'can',
  'could',
  'details',
  'event',
  'for',
  'give',
  'guests',
  'have',
  'i',
  'me',
  'need',
  'people',
  'person',
  'persons',
  'please',
  'show',
  'space',
  'that',
  'the',
  'to',
  'venue',
  'venues',
  'which',
  'with',
  'you',
])

function normalizeRoomLookupKey(roomName: string): string {
  return roomName
    .trim()
    .toLowerCase()
    .replace(/^the\s+/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
}

function getRoomLookupKeys(venue: VenueSearchResult): string[] {
  return [
    venue.name,
    venue.id,
    venue.name.replace(/^the\s+/i, ''),
    venue.id.replace(/[-_]+/g, ' '),
  ].map(normalizeRoomLookupKey)
}

function findVenueByRoomName(rawRoomName: unknown): VenueSearchResult | undefined {
  const requestedRoomName = typeof rawRoomName === 'string' ? rawRoomName.trim() : ''

  if (!requestedRoomName) {
    return undefined
  }

  const lookupKey = normalizeRoomLookupKey(requestedRoomName)

  return venueSearchResults.find((venue) => getRoomLookupKeys(venue).includes(lookupKey))
}

function hasProjector(venue: VenueSearchResult): boolean {
  return (
    venue.top_amenities.includes('projector') ||
    venue.detailed_amenities.some((amenity) => amenity.id === 'projector')
  )
}

function toVenueRoom(venue: VenueSearchResult): VenueRoom {
  return {
    id: venue.id,
    name: venue.name,
    capacity: venue.capacity,
    location: venue.location,
    pricePerDay: venue.price_per_day,
    currencyCode: VENUE_CURRENCY_CODE,
    formattedPricePerDay: formatVenueCurrency(venue.price_per_day),
    hasProjector: hasProjector(venue),
    availableDates: venue.all_available_dates,
  }
}

function getStringField(value: unknown, key: string): string {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return ''
  }

  const fieldValue = (value as Record<string, unknown>)[key]
  return typeof fieldValue === 'string' ? fieldValue.trim() : ''
}

function getNumberField(value: unknown, key: string): number | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null
  }

  const fieldValue = (value as Record<string, unknown>)[key]
  if (typeof fieldValue === 'number' && Number.isFinite(fieldValue)) {
    return Math.max(0, Math.round(fieldValue))
  }

  if (typeof fieldValue === 'string') {
    const parsed = Number.parseInt(fieldValue, 10)
    return Number.isFinite(parsed) ? Math.max(0, parsed) : null
  }

  return null
}

function getStringArrayField(value: unknown, key: string): string[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return []
  }

  const fieldValue = (value as Record<string, unknown>)[key]
  if (!Array.isArray(fieldValue)) {
    return []
  }

  return fieldValue.filter((item): item is string => typeof item === 'string')
}

function tokenize(value: string): string[] {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/[\s-]+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 2 && !/^\d+$/.test(token) && !STOP_WORDS.has(token)),
    ),
  )
}

function inferCapacityFromText(text: string): CapacitySearch {
  const rangeMatch = text.match(/(\d{1,4})\s*(?:-|to|and|–)\s*(\d{1,4})/i)
  if (rangeMatch) {
    const first = Number.parseInt(rangeMatch[1], 10)
    const second = Number.parseInt(rangeMatch[2], 10)

    return {
      guestCount: null,
      minCapacity: Math.min(first, second),
      maxCapacity: Math.max(first, second),
      inferredFromText: true,
    }
  }

  const singleMatch = text.match(/(?:around|about|approximately|approx\.?|for|of)?\s*(\d{1,4})\s*(?:people|persons|guests|attendees|pax)\b/i)
  if (singleMatch) {
    return {
      guestCount: Number.parseInt(singleMatch[1], 10),
      minCapacity: null,
      maxCapacity: null,
      inferredFromText: true,
    }
  }

  return {
    guestCount: null,
    minCapacity: null,
    maxCapacity: null,
    inferredFromText: false,
  }
}

function getAmenityIds(venue: VenueSearchResult): string[] {
  return Array.from(
    new Set([
      ...venue.top_amenities,
      ...venue.detailed_amenities.map((amenity) => amenity.id),
    ]),
  )
}

function normalizeAmenity(rawAmenity: string): string | null {
  const normalized = rawAmenity.trim().toLowerCase().replace(/\s+/g, '-')
  return AMENITY_ALIASES[normalized] ?? (normalized || null)
}

function inferAmenities(text: string): string[] {
  const normalizedText = text.toLowerCase()
  const amenities = new Set<string>()

  for (const [keyword, amenity] of Object.entries(AMENITY_ALIASES)) {
    if (new RegExp(`\\b${keyword}\\b`, 'i').test(normalizedText)) {
      amenities.add(amenity)
    }
  }

  return Array.from(amenities)
}

function buildVenueSearchText(venue: VenueSearchResult): string {
  const compactLabels = Object.values(venue.compact_amenity_labels)
  const detailedLabels = venue.detailed_amenities.map((amenity) => amenity.label)

  return [
    venue.name,
    venue.location,
    venue.description,
    venue.dimensions,
    venue.cancellation_policy,
    ...venue.top_amenities,
    ...venue.detailed_amenities.map((amenity) => amenity.id),
    ...compactLabels,
    ...detailedLabels,
  ]
    .join(' ')
    .toLowerCase()
}

function buildVenueSummary(venue: VenueSearchResult, scoredVenue: ScoredVenue, fit: 'exact' | 'suggestion') {
  return {
    fit,
    name: venue.name,
    location: venue.location,
    capacity: venue.capacity,
    formattedPricePerDay: formatVenueCurrency(venue.price_per_day),
    nextAvailableDate: venue.next_available_date,
    availableDates: venue.all_available_dates,
    amenities: venue.detailed_amenities.map((amenity) => amenity.label),
    matchedAmenities: scoredVenue.matchedAmenities,
    matchedTerms: scoredVenue.matchedTerms,
    description: venue.description,
    matchReason:
      fit === 'exact'
        ? 'Matches the requested capacity, date, facilities, and planning details.'
        : 'Suggested because it is the closest available fit from the current venue catalog.',
  }
}

function normalizeSearchCriteria(rawCriteria?: unknown): VenueSearchCriteria {
  const query = getStringField(rawCriteria, 'query')
  const eventType = getStringField(rawCriteria, 'eventType')
  const details = getStringField(rawCriteria, 'details')
  const combinedText = [query, eventType, details].filter(Boolean).join(' ')
  const inferredCapacity = inferCapacityFromText(combinedText)
  const rawDate = getStringField(rawCriteria, 'date')
  const requiredAmenities = [
    ...getStringArrayField(rawCriteria, 'requiredAmenities'),
    ...getStringArrayField(rawCriteria, 'amenities'),
    ...inferAmenities(combinedText),
  ]
    .map(normalizeAmenity)
    .filter((amenity): amenity is string => Boolean(amenity))

  return {
    query,
    eventType,
    details,
    date: rawDate ? normalizeDateKey(rawDate) : '',
    requiredAmenities: Array.from(new Set(requiredAmenities)),
    capacity: {
      guestCount: getNumberField(rawCriteria, 'guestCount') ?? inferredCapacity.guestCount,
      minCapacity: getNumberField(rawCriteria, 'minCapacity') ?? inferredCapacity.minCapacity,
      maxCapacity: getNumberField(rawCriteria, 'maxCapacity') ?? inferredCapacity.maxCapacity,
      inferredFromText: inferredCapacity.inferredFromText,
    },
  }
}

function getExpandedTerms(criteria: VenueSearchCriteria): {
  directTerms: string[]
  eventTypeTerms: string[]
  planningTerms: string[]
  allTerms: string[]
} {
  const eventTypeTerms = tokenize(criteria.eventType)
  const planningTerms = tokenize([criteria.query, criteria.details].join(' '))
  const directTerms = Array.from(new Set([...planningTerms, ...eventTypeTerms]))
  const eventHints = directTerms.flatMap((term) => EVENT_TYPE_HINTS[term] ?? [])
  const allTerms = Array.from(new Set([...directTerms, ...eventHints].filter(Boolean)))

  return { directTerms, eventTypeTerms, planningTerms, allTerms }
}

function getCapacityDistance(capacity: number, capacitySearch: CapacitySearch): number {
  const { guestCount, minCapacity, maxCapacity } = capacitySearch

  if (guestCount !== null) {
    return capacity >= guestCount ? capacity - guestCount : guestCount - capacity + 1000
  }

  if (minCapacity !== null && maxCapacity !== null) {
    if (capacity >= minCapacity && capacity <= maxCapacity) {
      return 0
    }

    return capacity < minCapacity ? minCapacity - capacity + 1000 : capacity - maxCapacity
  }

  if (minCapacity !== null) {
    return capacity >= minCapacity ? capacity - minCapacity : minCapacity - capacity + 1000
  }

  if (maxCapacity !== null) {
    return capacity <= maxCapacity ? maxCapacity - capacity : capacity - maxCapacity + 1000
  }

  return 0
}

function matchesCapacity(capacity: number, capacitySearch: CapacitySearch): boolean {
  const { guestCount, minCapacity, maxCapacity } = capacitySearch

  if (guestCount !== null) {
    return capacity >= guestCount
  }

  if (minCapacity !== null && capacity < minCapacity) {
    return false
  }

  if (maxCapacity !== null && capacity > maxCapacity) {
    return false
  }

  return true
}

function scoreVenue(venue: VenueSearchResult, criteria: VenueSearchCriteria): ScoredVenue {
  const { eventTypeTerms, planningTerms, allTerms } = getExpandedTerms(criteria)
  const venueSearchText = buildVenueSearchText(venue)
  const venueAmenityIds = getAmenityIds(venue)
  const matchedTerms = allTerms.filter((term) => venueSearchText.includes(term))
  const matchedEventTypeTerms = eventTypeTerms.filter((term) => venueSearchText.includes(term))
  const matchedPlanningTerms = planningTerms.filter((term) => venueSearchText.includes(term))
  const matchedAmenities = criteria.requiredAmenities.filter((amenity) =>
    venueAmenityIds.includes(amenity),
  )
  const dateMatches = !criteria.date || venue.all_available_dates.includes(criteria.date)
  const amenitiesMatch = matchedAmenities.length === criteria.requiredAmenities.length
  const capacityMatches = matchesCapacity(venue.capacity, criteria.capacity)
  const eventTypeMatches = eventTypeTerms.length === 0 || matchedEventTypeTerms.length > 0
  const planningTextMatches = planningTerms.length === 0 || matchedPlanningTerms.length > 0
  const textMatches = eventTypeMatches && planningTextMatches
  const capacityDistance = getCapacityDistance(venue.capacity, criteria.capacity)
  const score =
    matchedTerms.length * 12 +
    matchedAmenities.length * 14 +
    (capacityMatches ? 30 : Math.max(0, 16 - Math.min(capacityDistance, 16))) +
    (dateMatches ? 12 : 0)

  return {
    venue,
    exact: dateMatches && amenitiesMatch && capacityMatches && textMatches,
    score,
    matchedAmenities,
    matchedTerms,
    capacityDistance,
  }
}

export const roomNames = venueSearchResults.map((venue) => venue.name)

/**
 * Lists venues for broad availability questions.
 *
 * @param rawDate - Optional date to filter against, in yyyy-mm-dd or supported natural language format.
 * @returns Venue summaries safe to pass back to the model.
 */
export function listAvailableVenues(rawDate?: unknown) {
  const requestedDate = typeof rawDate === 'string' ? rawDate.trim() : ''
  const date = requestedDate ? normalizeDateKey(requestedDate) : ''

  if (requestedDate && !date) {
    return {
      success: false,
      date: '',
      venues: [],
      message: 'Please provide a valid date to check venue availability.',
    }
  }

  const matchingVenues = date
    ? venueSearchResults.filter((venue) => venue.all_available_dates.includes(date))
    : venueSearchResults

  return {
    success: true,
    date,
    venues: matchingVenues.map((venue) => ({
      name: venue.name,
      location: venue.location,
      capacity: venue.capacity,
      formattedPricePerDay: formatVenueCurrency(venue.price_per_day),
      nextAvailableDate: venue.next_available_date,
      availableDates: venue.all_available_dates,
    })),
    message: date
      ? `${matchingVenues.length} venue${matchingVenues.length === 1 ? ' is' : 's are'} available on ${date}.`
      : 'Here are the available venues and their next available dates.',
  }
}

/**
 * Searches venues by guest count/range, date, facilities, event type, or free-text
 * planning details. If no venue exactly matches every criterion, the response
 * still returns the closest suggestions from the catalog.
 *
 * @param rawCriteria - Tool arguments from the model, or any unknown input.
 * @returns Search result with exact matches or fallback suggestions.
 */
export function searchVenues(rawCriteria?: unknown) {
  const rawDate = getStringField(rawCriteria, 'date')
  const criteria = normalizeSearchCriteria(rawCriteria)

  if (rawDate && !criteria.date) {
    return {
      success: false,
      exactMatchCount: 0,
      suggestionCount: 0,
      venues: [],
      message: 'Please provide a valid date to search venues.',
    }
  }

  const scoredVenues = venueSearchResults
    .map((venue) => scoreVenue(venue, criteria))
    .sort(
      (left, right) =>
        Number(right.exact) - Number(left.exact) ||
        right.score - left.score ||
        left.capacityDistance - right.capacityDistance ||
        right.venue.capacity - left.venue.capacity,
    )

  const exactMatches = scoredVenues.filter((result) => result.exact)
  const selectedMatches = exactMatches.length ? exactMatches : scoredVenues.slice(0, 3)
  const venues = selectedMatches.map((result) =>
    buildVenueSummary(result.venue, result, exactMatches.length ? 'exact' : 'suggestion'),
  )

  return {
    success: true,
    query: criteria.query,
    eventType: criteria.eventType,
    date: criteria.date,
    capacity: criteria.capacity,
    requiredAmenities: criteria.requiredAmenities,
    exactMatchCount: exactMatches.length,
    suggestionCount: exactMatches.length ? 0 : venues.length,
    venues,
    message: exactMatches.length
      ? `${exactMatches.length} venue${exactMatches.length === 1 ? '' : 's'} match your request.`
      : "We don't have an exact venue match for every detail, but these are the closest suggestions from the current facilities.",
  }
}

/**
 * Resolves user/model supplied room names against the canonical JSON venue catalog.
 *
 * @param rawRoomName - Unknown room input from a form field or model tool call.
 * @returns The canonical room name when matched case-insensitively; otherwise the trimmed input.
 */
export function resolveRoomName(rawRoomName: unknown): string {
  const requestedRoomName = typeof rawRoomName === 'string' ? rawRoomName.trim() : ''

  return findVenueByRoomName(requestedRoomName)?.name ?? requestedRoomName
}

/**
 * Looks up venue details using a potentially non-canonical room name.
 *
 * @param rawRoomName - Room name from the UI or model.
 * @returns VenueRoom details when the room exists; otherwise undefined.
 */
export function getRoomByName(rawRoomName: unknown): VenueRoom | undefined {
  const venue = findVenueByRoomName(rawRoomName)

  return venue ? toVenueRoom(venue) : undefined
}

/**
 * Validates a room/date pair and returns a model-safe availability response.
 *
 * @param rawRoomName - Room name from the UI or model.
 * @param rawDate - Date input in yyyy-mm-dd or supported natural language format.
 * @returns RoomAvailabilityResult with normalized values and display-safe message.
 */
export function getRoomAvailability(rawRoomName: unknown, rawDate: unknown): RoomAvailabilityResult {
  const venue = findVenueByRoomName(rawRoomName)
  const roomName = venue?.name ?? resolveRoomName(rawRoomName)
  const date = normalizeDateKey(rawDate)

  if (!venue) {
    return {
      success: false,
      roomName,
      date,
      available: false,
      message: `Room '${roomName}' does not exist.`,
    }
  }

  if (!date) {
    return {
      success: false,
      roomName,
      date,
      available: false,
      message: 'Please provide a valid date for the quote request.',
    }
  }

  if (!venue.all_available_dates.includes(date)) {
    return {
      success: true,
      roomName,
      date,
      available: false,
      message: `${roomName} is not available on ${date}.`,
    }
  }

  return {
    success: true,
    roomName,
    date,
    available: true,
    message: `${roomName} is available on ${date}.`,
  }
}
