import { useLocation } from 'react-router-dom'
import { useAppDispatch } from '../app/hooks'
import {
  availableVenuesSchema,
  checkAvailabilitySchema,
  pricingSchema,
  quoteRequestSchema,
  roomDetailsSchema,
  venueSearchSchema,
} from '../data/agentToolSchemas'
import { venueSearchResults } from '../data/venueSearchResults'
import { agentQueryRecorded } from '../features/agent/agentActivitySlice'
import {
  quoteDraftPrepared,
  quoteFormHandoffRequested,
  quoteStatusSet,
} from '../features/quote/quoteSlice'
import { useAgentTool } from '../hooks/useAgentTool'
import {
  getRoomAvailability,
  getRoomByName,
  listAvailableVenues,
  resolveRoomName,
  roomNames,
  searchVenues,
} from '../services/venueAvailability'
import type { AgentToolParams } from '../types/agentTool'

function getStringParam(params: AgentToolParams | unknown, key: string): string {
  if (typeof params !== 'object' || params === null || Array.isArray(params)) {
    return ''
  }

  const value = (params as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : ''
}

export default function VenueAgentTools() {
  const dispatch = useAppDispatch()
  const location = useLocation()
  const currentVenue = venueSearchResults.find(
    (venue) => location.pathname === `/venues/${venue.id}`,
  )

  useAgentTool(
    {
      name: 'list_available_venues',
      description:
        'Lists venue options for broad user questions like "which venues are available?" If a date is provided, returns only venues available on that date; otherwise returns all venues with their next available dates.',
      schema: availableVenuesSchema,
    },
    (params) => {
      const date = getStringParam(params, 'date')
      dispatch(agentQueryRecorded(date ? `Listing available venues on ${date}` : 'Listing venues'))
      return listAvailableVenues(date)
    },
  )

  useAgentTool(
    {
      name: 'search_venues',
      description:
        'Searches venues by guest count, capacity range, date, event type, facilities, amenities, or free-text planning details. Returns exact matches when possible and close suggestions when no venue matches every detail.',
      schema: venueSearchSchema,
    },
    (params) => {
      const result = searchVenues(params)
      dispatch(agentQueryRecorded('Searching venues by planning requirements'))
      return result
    },
  )

  useAgentTool(
    {
      name: 'get_room_details',
      description:
        'Retrieves the capacity, pricing, and equipment details for a specific room at this event venue.',
      schema: roomDetailsSchema,
    },
    (params) => {
      const roomName = resolveRoomName(getStringParam(params, 'roomName'))
      const roomInfo = getRoomByName(roomName)
      dispatch(agentQueryRecorded(roomInfo?.name ?? roomName))
      if (roomInfo) {
        return { success: true, data: roomInfo }
      }
      return {
        success: false,
        message: `Room '${roomName}' not found. Available rooms are: ${roomNames.join(', ')}`,
      }
    },
  )

  useAgentTool(
    {
      name: 'prepare_quote_request',
      description:
        'Prefills the visible quote request form only when the requested room is available on the requested date. A successful call minimizes the chat and scrolls the user to the filled form. The user must still click submit.',
      schema: quoteRequestSchema,
    },
    (params) => {
      const roomName = getStringParam(params, 'roomName') || currentVenue?.name || ''
      const date = getStringParam(params, 'date')
      const email = getStringParam(params, 'email')
      const availability = getRoomAvailability(roomName, date)
      dispatch(
        agentQueryRecorded(
          `Preparing quote request for ${availability.roomName || roomName} on ${
            availability.date || date
          }`,
        ),
      )
      if (!availability.success || !availability.available) {
        dispatch(quoteStatusSet(`${availability.message} Quote request form was not prepared.`))
        return {
          success: false,
          available: availability.available,
          message: `${availability.message} Quote request form was not prepared.`,
        }
      }
      dispatch(
        quoteDraftPrepared({
          roomName: availability.roomName,
          date: availability.date,
          email,
        }),
      )
      dispatch(quoteStatusSet(null))
      dispatch(quoteFormHandoffRequested())
      return {
        success: true,
        available: true,
        message:
          'Quote request form prepared. The user must review it and click submit to send it.',
      }
    },
  )

  useAgentTool(
    {
      name: 'check_availability',
      description: 'Checks if a specific room is available on a given date.',
      schema: checkAvailabilitySchema,
    },
    (params) => {
      const roomName = getStringParam(params, 'roomName') || currentVenue?.name || ''
      const date = getStringParam(params, 'date')
      const availability = getRoomAvailability(roomName, date)
      dispatch(
        agentQueryRecorded(
          `Checking availability for ${availability.roomName || roomName} on ${
            availability.date || date
          }`,
        ),
      )
      return availability
    },
  )

  useAgentTool(
    {
      name: 'get_pricing',
      description: 'Returns the price per day for a specific room at this event venue.',
      schema: pricingSchema,
    },
    (params) => {
      const roomName = resolveRoomName(getStringParam(params, 'roomName'))
      const roomInfo = getRoomByName(roomName)
      dispatch(agentQueryRecorded(roomInfo?.name ?? roomName))
      if (roomInfo) {
        return {
          success: true,
          roomName: roomInfo.name,
          pricePerDay: roomInfo.pricePerDay,
          currencyCode: roomInfo.currencyCode,
          formattedPricePerDay: roomInfo.formattedPricePerDay,
          priceDescription: `${roomInfo.formattedPricePerDay} per day`,
        }
      }
      return {
        success: false,
        message: `Room '${roomName}' not found. Available rooms are: ${roomNames.join(', ')}`,
      }
    },
  )

  return null
}
