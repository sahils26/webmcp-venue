import { useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import {
  availableVenuesSchema,
  checkAvailabilitySchema,
  pricingSchema,
  quoteRequestSchema,
  recommendByEventTypeSchema,
  roomDetailsSchema,
  venueSearchSchema,
} from '../data/agentToolSchemas'
import { venueSearchResults } from '../data/venueSearchResults'
import { agentQueryRecorded } from '../features/agent/agentActivitySlice'
import {
  isVenueDateBooked,
  selectVenueBookings,
} from '../features/bookings/bookingSlice'
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
  recommendVenuesByEventType,
  resolveRoomName,
  roomNames,
  searchVenues,
} from '../services/venueAvailability'
import type { AgentToolParams } from '../types/agentTool'
import type { RoomAvailabilityResult } from '../types/venue'

function getStringParam(params: AgentToolParams | unknown, key: string): string {
  if (typeof params !== 'object' || params === null || Array.isArray(params)) {
    return ''
  }

  const value = (params as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : ''
}

function applyFrontendBookingBlock(
  availability: RoomAvailabilityResult,
  bookings: ReturnType<typeof selectVenueBookings>,
): RoomAvailabilityResult {
  const room = getRoomByName(availability.roomName)

  if (
    !room ||
    !availability.success ||
    !availability.available ||
    !availability.date ||
    !isVenueDateBooked(bookings, room.id, availability.date)
  ) {
    return availability
  }

  return {
    ...availability,
    available: false,
    message: `${availability.roomName} is already booked on ${availability.date}.`,
  }
}

export default function VenueAgentTools() {
  const dispatch = useAppDispatch()
  const bookings = useAppSelector(selectVenueBookings)
  const location = useLocation()
  const lastMatchedEventTypeRef = useRef('')
  const currentVenue = venueSearchResults.find(
    (venue) => location.pathname === `/venues/${venue.id}`,
  )

  useAgentTool(
    {
      name: 'list_available_venues',
      description:
        'Lists venue options for broad user questions like "which venues are available?" If a future date is provided, returns venues not blocked on that date; otherwise returns all venues.',
      schema: availableVenuesSchema,
    },
    (params) => {
      const date = getStringParam(params, 'date')
      dispatch(agentQueryRecorded(date ? `Listing available venues on ${date}` : 'Listing venues'))
      const result = listAvailableVenues(date)

      if (!result.success || !result.date) {
        return result
      }

      const venues = result.venues.filter((venue) => {
        const room = getRoomByName(venue.name)
        return room ? !isVenueDateBooked(bookings, room.id, result.date) : true
      })

      return {
        ...result,
        venues,
        message: `${venues.length} venue${venues.length === 1 ? ' is' : 's are'} available on ${result.date}.`,
      }
    },
  )

  useAgentTool(
    {
      name: 'search_venues',
      description:
        'Searches venues by guest count, capacity range, date, facilities, amenities, optional event type, or free-text planning details. Use this for requirements-based searches even when the user has no event type in mind. Returns exact matches when possible and close suggestions when no venue matches every detail.',
      schema: venueSearchSchema,
    },
    (params) => {
      const result = searchVenues(params)
      const matchedEventType = getStringParam(result, 'matchedEventType')
      lastMatchedEventTypeRef.current = matchedEventType
      dispatch(agentQueryRecorded('Searching venues by planning requirements'))
      return result
    },
  )

  useAgentTool(
    {
      name: 'recommend_venues_by_event_type',
      description:
        'Recommends venues suited to a specific event type (e.g. birthday, wedding, conference, workshop, gala, dinner). Use this only when the user states the kind of event they are planning. Returns venues tagged for that event type, or the list of supported event types when the input is unrecognised.',
      schema: recommendByEventTypeSchema,
    },
    (params) => {
      const eventType = getStringParam(params, 'eventType')
      const result = recommendVenuesByEventType(eventType)
      const matchedEventType = getStringParam(result, 'matchedEventType')
      lastMatchedEventTypeRef.current = matchedEventType
      dispatch(
        agentQueryRecorded(
          eventType ? `Recommending venues for ${eventType}` : 'Recommending venues by event type',
        ),
      )
      return result
    },
  )

  useAgentTool(
    {
      name: 'get_room_details',
      description:
        'Retrieves the capacity, pricing, equipment details, and current booking note for a specific room at this event venue.',
      schema: roomDetailsSchema,
    },
    (params) => {
      const roomName = resolveRoomName(getStringParam(params, 'roomName'))
      const roomInfo = getRoomByName(roomName)
      dispatch(agentQueryRecorded(roomInfo?.name ?? roomName))
      if (roomInfo) {
        return {
          success: true,
          data: {
            ...roomInfo,
            availableDates: [],
            blockedDates: bookings
              .filter((booking) => booking.venueId === roomInfo.id)
              .map((booking) => booking.date),
            availabilityNote: 'All future dates are available unless already booked.',
          },
        }
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
        'Prefills the visible quote request form only when the requested room is available on the requested date and, when an event type was mentioned, suitable for that event type. A successful call minimizes the chat and scrolls the user to the filled form. The user must still click submit.',
      schema: quoteRequestSchema,
    },
    (params) => {
      const roomName = getStringParam(params, 'roomName') || currentVenue?.name || ''
      const date = getStringParam(params, 'date')
      const email = getStringParam(params, 'email')
      const eventType = getStringParam(params, 'eventType') || lastMatchedEventTypeRef.current
      const availability = applyFrontendBookingBlock(
        getRoomAvailability(roomName, date, eventType),
        bookings,
      )
      if (availability.matchedEventType) {
        lastMatchedEventTypeRef.current = availability.matchedEventType
      }
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
          ...availability,
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
        ...availability,
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
      description:
        'Checks if a specific room is available on a given date and, when an event type was mentioned, whether that room is suitable for the event type. If no event type was mentioned, checks date availability only.',
      schema: checkAvailabilitySchema,
    },
    (params) => {
      const roomName = getStringParam(params, 'roomName') || currentVenue?.name || ''
      const date = getStringParam(params, 'date')
      const eventType = getStringParam(params, 'eventType') || lastMatchedEventTypeRef.current
      const availability = applyFrontendBookingBlock(
        getRoomAvailability(roomName, date, eventType),
        bookings,
      )
      if (availability.matchedEventType) {
        lastMatchedEventTypeRef.current = availability.matchedEventType
      }
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
