import type { JsonSchema } from '../types/agentTool'

/**
 * Schema for get_room_details.
 *
 * Expected model arguments:
 * - roomName: one of the room names in venueData, or a close case-insensitive match.
 *
 * Tool response:
 * - success true with room capacity, daily price, and projector availability.
 * - success false with a list of valid rooms when the room is unknown.
 */
export const roomDetailsSchema: JsonSchema = {
  type: 'object',
  properties: {
    roomName: {
      type: 'string',
      description:
        "The name of the room to get details for (e.g., 'Grand Hall', 'Meeting Room A', 'Lounge')",
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
      description: "The room the planner wants to book, such as 'Grand Hall'.",
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
 * - roomName: one of the room names in venueData.
 *
 * Tool response:
 * - success true with pricePerDay for the requested room.
 * - success false when the room is unknown.
 */
export const pricingSchema: JsonSchema = {
  type: 'object',
  properties: {
    roomName: {
      type: 'string',
      description: "The name of the room to get pricing for (e.g., 'Grand Hall', 'Lounge')",
    },
  },
  required: ['roomName'],
}