import { type ChangeEvent, type FormEvent, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import AgentChat from '../components/AgentChat'
import WelcomePage from '../components/WelcomePage'
import VenueSearchCard from '../components/VenueSearchCard'
import {
  checkAvailabilitySchema,
  pricingSchema,
  quoteRequestSchema,
  roomDetailsSchema,
} from '../data/agentToolSchemas'
import { venueSearchResults } from '../data/venueSearchResults'
import { agentQueryRecorded, selectLastAgentQuery } from '../features/agent/agentActivitySlice'
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
  roomNames,
  resolveRoomName,
} from '../services/venueAvailability'
import type { AgentToolParams } from '../types/agentTool'
import './style/VenuePage.scss'

function getStringParam(params: AgentToolParams, key: string): string {
  const value = params[key]
  return typeof value === 'string' ? value : ''
}

export default function VenuePage() {
  const dispatch = useAppDispatch()
  const lastAgentQuery = useAppSelector(selectLastAgentQuery)
  const quoteDraft = useAppSelector(selectQuoteDraft)
  const quoteStatus = useAppSelector(selectQuoteStatus)

  // Welcome page state management
  const [hasInteracted, setHasInteracted] = useState(false)
  const [initialMessage, setInitialMessage] = useState<string | null>(null)

  const handleWelcomeSubmit = (message: string) => {
    setInitialMessage(message)
    setHasInteracted(true)
  }

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
        'Prefills the quote request form only when the requested room is available on the requested date. The user must still click submit.',
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
      return {
        success: true,
        available: true,
        message: 'Quote request form prepared. The user must click submit to send it.',
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

  if (!hasInteracted) {
    return <WelcomePage onSubmit={handleWelcomeSubmit} />
  }

  return (
    <main className="venue-page">
      <section className="venue-page__hero">
        <p className="venue-page__eyebrow">spaces360 prototype</p>
        <h1 className="venue-page__title">spaces360 venues</h1>
        <p className="venue-page__description">
          Find polished event spaces for corporate events, galas, workshops, and client
          hospitality across central Germany.
        </p>
      </section>

      <div className="venue-page__grid">
        <div className="venue-page__primary">
          <section
            className="venue-panel venue-panel--results"
            aria-labelledby="available-rooms-title"
          >
            <div className="venue-panel__header">
              <h2 id="available-rooms-title" className="venue-panel__title">
                Available Spaces
              </h2>
              <p className="venue-panel__subtitle">Curated rooms for focused event comparisons.</p>
            </div>
            <ul className="venue-result-list">
              {venueSearchResults.map((venue) => (
                <li key={venue.id}>
                  <VenueSearchCard venue={venue} />
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="venue-page__sidebar">
          <aside
            className={`venue-panel venue-panel--monitor ${
              lastAgentQuery ? 'venue-panel--active' : ''
            }`}
            aria-live="polite"
          >
            <div className="venue-panel__header">
              <h2 className="venue-panel__title">Agent Activity Monitor</h2>
              <p className="venue-panel__subtitle">
                Watch incoming tool calls from the AI assistant.
              </p>
            </div>
            {lastAgentQuery ? (
              <p className="agent-status agent-status--active">
                The AI agent just requested details for <strong>{lastAgentQuery}</strong>.
              </p>
            ) : (
              <p className="agent-status">
                Waiting for the AI agent to invoke <code>get_room_details</code>.
              </p>
            )}
          </aside>

          <section className="venue-panel venue-panel--quote" aria-labelledby="quote-title">
            <div className="venue-panel__header">
              <h2 id="quote-title" className="venue-panel__title">
                Request a Quote
              </h2>
              <p className="venue-panel__subtitle">
                This form is agent-ready. The AI can fill it out, but requires your click to submit.
              </p>
            </div>
            <form className="quote-form" onSubmit={handleQuoteSubmit}>
              <label className="quote-form__field" htmlFor="quote-room-name">
                <span>Room Name</span>
                <input
                  id="quote-room-name"
                  type="text"
                  name="roomName"
                  value={quoteDraft.roomName}
                  onChange={handleQuoteFieldChange}
                  required
                />
              </label>
              <label className="quote-form__field" htmlFor="quote-date">
                <span>Date</span>
                <input
                  id="quote-date"
                  type="date"
                  name="date"
                  value={quoteDraft.date}
                  onChange={handleQuoteFieldChange}
                  required
                />
              </label>
              <label className="quote-form__field" htmlFor="quote-email">
                <span>Your Email</span>
                <input
                  id="quote-email"
                  type="email"
                  name="email"
                  value={quoteDraft.email}
                  onChange={handleQuoteFieldChange}
                  required
                />
              </label>
              <button className="quote-form__submit" type="submit">
                Submit Quote Request
              </button>
            </form>
            {quoteStatus && (
              <div className="quote-status" role="status">
                {quoteStatus}
              </div>
            )}
          </section>
        </div>
      </div>

      <AgentChat initialMessage={initialMessage} />
    </main>
  )
}
