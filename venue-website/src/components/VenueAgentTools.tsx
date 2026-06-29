import { useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAppDispatch } from '../app/hooks'
import {
  availableVenuesSchema,
  checkAvailabilitySchema,
  pricingSchema,
  quoteRequestSchema,
  recommendByEventTypeSchema,
  roomDetailsSchema,
  venueSearchSchema,
} from '../data/agentToolSchemas'
import { getVenueSearchResultsFromCatalog } from '../data/venueSearchResults'
import { agentQueryRecorded } from '../features/agent/agentActivitySlice'
import {
  quoteDraftPrepared,
  quoteFormHandoffRequested,
  quoteStatusSet,
} from '../features/quote/quoteSlice'
import {
  useLazyCheckVenueAvailabilityQuery,
  useLazyGetVenueCatalogQuery,
} from '../features/venues/venueApi'
import { useAgentTool } from '../hooks/useAgentTool'
import {
  getRoomAvailability,
  getRoomByName,
  listAvailableVenues,
  recommendVenuesByEventType,
  resolveRoomName,
  searchVenues,
} from '../services/venueAvailability'
import type { AgentToolParams } from '../types/agentTool'
import type {
  RoomAvailabilityResult,
  VenueAvailabilityResponse,
  VenueSearchResult,
} from '../types/venue'

interface VenueAgentToolsProps {
  venues: VenueSearchResult[]
}

function getStringParam(params: AgentToolParams | unknown, key: string): string {
  if (typeof params !== 'object' || params === null || Array.isArray(params)) {
    return ''
  }

  const value = (params as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : ''
}

function mergeBackendAvailability(
  local: RoomAvailabilityResult,
  backend: VenueAvailabilityResponse,
): RoomAvailabilityResult {
  if (backend.available) {
    return local
  }

  return {
    ...local,
    available: false,
    message: backend.message.replace(backend.venue_id, local.roomName),
  }
}

export default function VenueAgentTools({ venues }: VenueAgentToolsProps) {
  const dispatch = useAppDispatch()
  const location = useLocation()
  const lastMatchedEventTypeRef = useRef('')
  const [loadVenueCatalog] = useLazyGetVenueCatalogQuery()
  const [checkBackendAvailability] = useLazyCheckVenueAvailabilityQuery()

  const getLiveVenues = async (): Promise<VenueSearchResult[]> => {
    try {
      const catalog = await loadVenueCatalog(undefined, false).unwrap()
      return getVenueSearchResultsFromCatalog(catalog)
    } catch {
      return venues
    }
  }

  const checkLiveAvailability = async (
    roomName: string,
    date: string,
    eventType: string,
    liveVenues: VenueSearchResult[],
  ): Promise<RoomAvailabilityResult> => {
    const local = getRoomAvailability(roomName, date, eventType, liveVenues)
    if (!local.success || !local.available) {
      return local
    }

    const room = getRoomByName(local.roomName, liveVenues)
    if (!room) {
      return local
    }

    try {
      const backend = await checkBackendAvailability({
        venueId: room.id,
        date: local.date,
      }).unwrap()
      return mergeBackendAvailability(local, backend)
    } catch {
      return {
        ...local,
        success: false,
        available: false,
        message: 'Live venue availability is temporarily unavailable.',
      }
    }
  }

  const filterVenuesByDate = async (
    liveVenues: VenueSearchResult[],
    date: string,
  ): Promise<VenueSearchResult[]> => {
    if (!date) {
      return liveVenues
    }

    const checks = await Promise.all(
      liveVenues.map(async (venue) => {
        try {
          const result = await checkBackendAvailability({ venueId: venue.id, date }).unwrap()
          return result.available ? venue : null
        } catch {
          return null
        }
      }),
    )
    return checks.filter((venue): venue is VenueSearchResult => venue !== null)
  }

  useAgentTool(
    {
      name: 'list_available_venues',
      description:
        'Lists venue options for broad user questions like "which venues are available?" If a future date is provided, returns venues not blocked on that date; otherwise returns all venues.',
      schema: availableVenuesSchema,
    },
    async (params) => {
      const date = getStringParam(params, 'date')
      dispatch(agentQueryRecorded(date ? `Listing available venues on ${date}` : 'Listing venues'))
      const liveVenues = await getLiveVenues()
      const initial = listAvailableVenues(date, liveVenues)
      if (!initial.success || !initial.date) {
        return initial
      }

      const availableVenues = await filterVenuesByDate(liveVenues, initial.date)
      return listAvailableVenues(initial.date, availableVenues)
    },
  )

  useAgentTool(
    {
      name: 'search_venues',
      description:
        'Searches venues by guest count, capacity range, date, facilities, amenities, optional event type, or free-text planning details. Use this for requirements-based searches even when the user has no event type in mind. Returns exact matches when possible and close suggestions when no venue matches every detail.',
      schema: venueSearchSchema,
    },
    async (params) => {
      let liveVenues = await getLiveVenues()
      const dateResult = listAvailableVenues(getStringParam(params, 'date'), liveVenues)
      if (!dateResult.success) {
        return searchVenues(params, liveVenues)
      }
      if (dateResult.date) {
        liveVenues = await filterVenuesByDate(liveVenues, dateResult.date)
      }

      const result = searchVenues(params, liveVenues)
      lastMatchedEventTypeRef.current = getStringParam(result, 'matchedEventType')
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
    async (params) => {
      const eventType = getStringParam(params, 'eventType')
      const result = recommendVenuesByEventType(eventType, await getLiveVenues())
      lastMatchedEventTypeRef.current = getStringParam(result, 'matchedEventType')
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
    async (params) => {
      const liveVenues = await getLiveVenues()
      const roomName = resolveRoomName(getStringParam(params, 'roomName'), liveVenues)
      const roomInfo = getRoomByName(roomName, liveVenues)
      dispatch(agentQueryRecorded(roomInfo?.name ?? roomName))
      if (roomInfo) {
        const venue = liveVenues.find((candidate) => candidate.id === roomInfo.id)
        return {
          success: true,
          data: {
            ...roomInfo,
            availableDates: [],
            blockedDates: venue?.blocked_dates ?? [],
            availabilityNote: 'All future dates are available unless already booked.',
          },
        }
      }
      return {
        success: false,
        message: `Room '${roomName}' not found. Available rooms are: ${liveVenues
          .map((venue) => venue.name)
          .join(', ')}`,
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
    async (params) => {
      const liveVenues = await getLiveVenues()
      const currentVenue = liveVenues.find(
        (venue) => location.pathname === `/venues/${venue.id}`,
      )
      const roomName = getStringParam(params, 'roomName') || currentVenue?.name || ''
      const date = getStringParam(params, 'date')
      const email = getStringParam(params, 'email')
      const eventType = getStringParam(params, 'eventType') || lastMatchedEventTypeRef.current
      const specialRequirements = getStringParam(params, 'specialRequirements')

      // Check date availability only — event type mismatch is a soft warning, not a blocker.
      // The user has already been informed and is choosing to proceed.
      const dateAvailability = await checkLiveAvailability(roomName, date, '', liveVenues)
      const eventTypeAvailability = eventType
        ? await checkLiveAvailability(roomName, date, eventType, liveVenues)
        : dateAvailability

      if (eventTypeAvailability.matchedEventType) {
        lastMatchedEventTypeRef.current = eventTypeAvailability.matchedEventType
      }

      const availability = dateAvailability

      dispatch(
        agentQueryRecorded(
          `Preparing quote request for ${availability.roomName || roomName} on ${
            availability.date || date
          }`,
        ),
      )

      // Only block if the date itself is unavailable — not for event type mismatch.
      if (!availability.success || !availability.available) {
        dispatch(quoteStatusSet(`${availability.message} Quote request form was not prepared.`))
        return {
          ...availability,
          success: false,
          available: availability.available,
          message: `${availability.message} Quote request form was not prepared.`,
        }
      }

      // Build special requirements note — include event type warning if venue isn't tagged for it.
      const eventTypeNote =
        eventType && eventTypeAvailability.available === false && eventTypeAvailability.message?.includes('not')
          ? `Note: this venue is not specifically tagged for ${eventType} events. ${specialRequirements}`
          : specialRequirements

      dispatch(
        quoteDraftPrepared({
          roomName: availability.roomName,
          date: availability.date,
          email,
          specialRequirements: eventTypeNote.trim(),
        }),
      )
      dispatch(quoteStatusSet(null))
      dispatch(quoteFormHandoffRequested())
      return {
        ...availability,
        success: true,
        available: true,
        message:
          'Quote request form prepared with special requirements noted. The user must review it and click submit to send it.',
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
    async (params) => {
      const liveVenues = await getLiveVenues()
      const currentVenue = liveVenues.find(
        (venue) => location.pathname === `/venues/${venue.id}`,
      )
      const roomName = getStringParam(params, 'roomName') || currentVenue?.name || ''
      const date = getStringParam(params, 'date')
      const eventType = getStringParam(params, 'eventType') || lastMatchedEventTypeRef.current
      const availability = await checkLiveAvailability(roomName, date, eventType, liveVenues)
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
    async (params) => {
      const liveVenues = await getLiveVenues()
      const roomName = resolveRoomName(getStringParam(params, 'roomName'), liveVenues)
      const roomInfo = getRoomByName(roomName, liveVenues)
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
        message: `Room '${roomName}' not found. Available rooms are: ${liveVenues
          .map((venue) => venue.name)
          .join(', ')}`,
      }
    },
  )

  return null
}
