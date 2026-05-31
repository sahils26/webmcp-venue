import type { JsonSchema } from '../types/agentTool'

/**
 * Schema for list_available_venues.
 *
 * Expected model arguments:
 * - date: optional event date in yyyy-mm-dd format.
 *
 * Tool response:
 * - success true with all venues and their next available date when no date is supplied.
 * - success true with venues available on the supplied date when a valid date is supplied.
 * - success false when a supplied date is invalid.
 */
export const availableVenuesSchema: JsonSchema = {
  type: 'object',
  properties: {
    date: {
      type: 'string',
      description:
        'Optional event date in YYYY-MM-DD format. Omit this when the user asks for available venues without a specific date.',
    },
  },
}

/**
 * Schema for search_venues.
 *
 * Expected model arguments:
 * - query/details/eventType: free-text planning context, such as "conference",
 *   "wedding reception with parking", or "venue for 100 to 150 people".
 * - guestCount: single expected attendance number.
 * - minCapacity/maxCapacity: capacity range when the user gives one.
 * - date: optional requested event date in yyyy-mm-dd format.
 * - requiredAmenities: optional facilities such as projector, catering, parking,
 *   wifi, outdoor, or stage.
 *
 * Tool response:
 * - success true with exact matches when all criteria are satisfied.
 * - success true with closest suggestions when no exact venue exists.
 * - success false only for invalid dates.
 */
export const venueSearchSchema: JsonSchema = {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      description:
        'The full user request or free-text planning details, including capacity, event type, facilities, or general requirements.',
    },
    details: {
      type: 'string',
      description:
        'Additional event planning details, such as seating, presentation, catering, parking, outdoor, or atmosphere needs.',
    },
    eventType: {
      type: 'string',
      description:
        "Event category such as conference, workshop, networking, gala, dinner, reception, wedding, seminar, training, launch, or offsite.",
    },
    guestCount: {
      type: 'number',
      description:
        'Single expected attendance number when the user asks for a venue for around N people.',
    },
    minCapacity: {
      type: 'number',
      description: 'Lower bound of the requested guest capacity range.',
    },
    maxCapacity: {
      type: 'number',
      description: 'Upper bound of the requested guest capacity range.',
    },
    date: {
      type: 'string',
      description: 'Optional requested event date in YYYY-MM-DD format.',
    },
    requiredAmenities: {
      type: 'array',
      description:
        'Facilities the venue should include. Supported values include projector, catering, parking, wifi, outdoor, and stage.',
      items: {
        type: 'string',
      },
    },
  },
}

/**
 * Schema for get_room_details.
 *
 * Expected model arguments:
 * - roomName: one of the venue names in venueSearchResults.json, or a close
 *   case-insensitive match.
 *
 * Tool response:
 * - success true with room capacity, daily price, EUR currency code, formatted
 *   euro price, and projector availability.
 * - success false with a list of valid rooms when the room is unknown.
 */
export const roomDetailsSchema: JsonSchema = {
  type: 'object',
  properties: {
    roomName: {
      type: 'string',
      description:
        "The venue name to get details for (e.g., 'The Grand Hall', 'River Conference Suite')",
    },
  },
  required: ['roomName'],
}

/**
 * Schema for check_availability.
 *
 * Expected model arguments:
 * - roomName: room name to evaluate.
 * - date: requested event date in yyyy-mm-dd format.
 *
 * Tool response:
 * - RoomAvailabilityResult describing whether the date can be booked.
 */
export const checkAvailabilitySchema: JsonSchema = {
  type: 'object',
  properties: {
    roomName: {
      type: 'string',
      description: 'The name of the room to check.',
    },
    date: {
      type: 'string',
      description: 'The date to check in YYYY-MM-DD format.',
    },
  },
  required: ['roomName', 'date'],
}

/**
 * Schema for prepare_quote_request.
 *
 * Expected model arguments:
 * - roomName: room to prefill in the quote form.
 * - date: requested event date in yyyy-mm-dd format.
 * - email: planner email address to prefill.
 *
 * Tool response:
 * - success true when the UI form was prepared.
 * - success false when the room is unknown, date is invalid, or date is unavailable.
 */
export const quoteRequestSchema: JsonSchema = {
  type: 'object',
  properties: {
    roomName: {
      type: 'string',
      description: "The venue the planner wants to book, such as 'The Grand Hall'.",
    },
    date: {
      type: 'string',
      description: 'The requested event date in YYYY-MM-DD format.',
    },
    email: {
      type: 'string',
      description: 'The planner email address for the quote request.',
    },
  },
  required: ['roomName', 'date', 'email'],
}

/**
 * Schema for get_pricing.
 *
 * Expected model arguments:
 * - roomName: one of the venue names in venueSearchResults.json.
 *
 * Tool response:
 * - success true with pricePerDay, currencyCode, formattedPricePerDay, and
 *   priceDescription for the requested room.
 * - success false when the room is unknown.
 */
export const pricingSchema: JsonSchema = {
  type: 'object',
  properties: {
    roomName: {
      type: 'string',
      description:
        "The venue name to get pricing for (e.g., 'The Grand Hall', 'River Conference Suite')",
    },
  },
  required: ['roomName'],
}
