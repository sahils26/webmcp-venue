import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import AgentChat from '../components/AgentChat'
import ContactSection from '../components/landing/ContactSection'
import GallerySection from '../components/landing/GallerySection'
import HeroSection from '../components/landing/HeroSection'
import QuoteRequestSection from '../components/landing/QuoteRequestSection'
import SiteFooter from '../components/landing/SiteFooter'
import SiteHeader from '../components/landing/SiteHeader'
import VenueDetailsModal from '../components/landing/VenueDetailsModal'
import VenueShowcaseSection from '../components/landing/VenueShowcaseSection'
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
  isQuoteDraftField,
  quoteDraftFieldChanged,
  quoteDraftPrepared,
  quoteStatusSet,
  selectQuoteDraft,
  selectQuoteStatus,
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
import type { VenueSearchResult } from '../types/venue'
import './style/VenuePage.scss'

function getStringParam(params: AgentToolParams | unknown, key: string): string {
  if (typeof params !== 'object' || params === null || Array.isArray(params)) {
    return ''
  }

  const value = (params as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : ''
}

export default function VenuePage() {
  const dispatch = useAppDispatch()
  const quoteDraft = useAppSelector(selectQuoteDraft)
  const quoteStatus = useAppSelector(selectQuoteStatus)

  // Which venue is open in the details modal (null = modal closed)
  const [selectedVenue, setSelectedVenue] = useState<VenueSearchResult | null>(null)
  const [quoteFormHandoffKey, setQuoteFormHandoffKey] = useState(0)

  // Lock body scroll when the modal is open
  useEffect(() => {
    document.body.style.overflow = selectedVenue ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [selectedVenue])

  useEffect(() => {
    if (!quoteFormHandoffKey) {
      return
    }

    document
      .getElementById('quote-request-section')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    document.getElementById('homepage-quote-submit')?.focus({ preventScroll: true })
  }, [quoteFormHandoffKey])

  const handleQuoteFieldChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    if (isQuoteDraftField(name)) {
      dispatch(quoteDraftFieldChanged({ name, value }))
    }
  }

  const handleQuoteSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const availability = getRoomAvailability(quoteDraft.roomName, quoteDraft.date)
    if (!availability.success || !availability.available) {
      dispatch(quoteStatusSet(`${availability.message} Quote request was not sent.`))
      return
    }
    dispatch(
      quoteStatusSet(
        `Quote requested for ${availability.roomName} on ${availability.date} by ${quoteDraft.email}.`,
      ),
    )
  }

  /**
   * Called when the user clicks "Check Availability" inside VenueDetailsModal.
   * Pre-fills the quote form room name so the AI or user can complete and submit it.
   */
  const handleCheckAvailability = (venueName: string) => {
    dispatch(quoteDraftPrepared({ roomName: venueName, date: '', email: '' }))
    dispatch(quoteStatusSet(null))
  }

  // ── Agent tool registrations (unchanged) ──────────────────────────────────

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
        'Prefills the homepage quote request form only when the requested room is available on the requested date. A successful call minimizes the chat and scrolls the user to the filled form. The user must still click submit.',
      schema: quoteRequestSchema,
    },
    (params) => {
      const roomName = getStringParam(params, 'roomName')
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
      setSelectedVenue(null)
      setQuoteFormHandoffKey((currentKey) => currentKey + 1)
      return {
        success: true,
        available: true,
        message:
          'Homepage quote request form prepared. The user must review it and click submit to send it.',
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
      const roomName = getStringParam(params, 'roomName')
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

  return (
    <>
      {/* 1. Sticky navigation */}
      <SiteHeader />

      {/* 2. Full-width hero */}
      <HeroSection />

      {/* 3. Sequential venue showcase */}
      <main id="venues" aria-label="Venue showcase">
        {venueSearchResults.map((venue, index) => (
          <VenueShowcaseSection
            key={venue.id}
            venue={venue}
            index={index}
            onOpenDetails={setSelectedVenue}
          />
        ))}
      </main>

      {/* 4. Gallery overview with filter pills */}
      <GallerySection venues={venueSearchResults} onOpenDetails={setSelectedVenue} />

      {/* 5. Contact section */}
      <ContactSection />

      {/* 6. Homepage quote form */}
      <QuoteRequestSection
        quoteDraft={quoteDraft}
        quoteStatus={selectedVenue ? null : quoteStatus}
        onQuoteFieldChange={handleQuoteFieldChange}
        onQuoteSubmit={handleQuoteSubmit}
      />

      {/* 7. Footer */}
      <SiteFooter />

      {/* 8. Venue details modal — renders only when selectedVenue is set */}
      <VenueDetailsModal
        venue={selectedVenue}
        onClose={() => setSelectedVenue(null)}
        quoteDraft={quoteDraft}
        quoteStatus={quoteStatus}
        onQuoteFieldChange={handleQuoteFieldChange}
        onQuoteSubmit={handleQuoteSubmit}
        onCheckAvailability={handleCheckAvailability}
      />

      {/* 9. Floating AI chat launcher */}
      <AgentChat minimizeRequestKey={quoteFormHandoffKey} />
    </>
  )
}
