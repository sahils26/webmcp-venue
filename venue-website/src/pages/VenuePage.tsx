import { type ChangeEvent, type FormEvent } from 'react'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import AgentChat from '../components/AgentChat'
import {
  checkAvailabilitySchema,
  quoteRequestSchema,
  roomDetailsSchema,
} from '../data/agentToolSchemas'
import { roomNames, venueRooms } from '../data/venueData'
import { agentQueryRecorded, selectLastAgentQuery } from '../features/agent/agentActivitySlice'
import {
  isQuoteDraftField,
  quoteDraftFieldChanged,
  quoteDraftPrepared,
  quoteStatusSet,
  selectQuoteDraft,
  selectQuoteStatus,
} from '../features/quote/quoteSlice'
import { useGetNearbyVenuesQuery } from '../features/venues/venueApi'
import { useAgentTool } from '../hooks/useAgentTool'
import {
  getRoomAvailability,
  getRoomByName,
  resolveRoomName,
} from '../services/venueAvailability'
import type { AgentToolParams } from '../types/agentTool'
import './style/VenuePage.scss'

/**
 * Safely extracts a string value from model-supplied tool parameters.
 *
 * @param params - Parsed tool arguments from the assistant.
 * @param key - Argument name to read.
 * @returns The string value when present, otherwise an empty string.
 */
function getStringParam(params: AgentToolParams, key: string): string {
  const value = params[key]
  return typeof value === 'string' ? value : ''
}

/**
 * Main venue page.
 *
 * Responsibilities:
 * - Render static local room inventory.
 * - Display optional live venue candidates from RTK Query.
 * - Read and update Redux-managed quote and agent state.
 * - Register assistant tools that need access to app state.
 */
export default function VenuePage() {
  const dispatch = useAppDispatch()
  const lastAgentQuery = useAppSelector(selectLastAgentQuery)
  const quoteDraft = useAppSelector(selectQuoteDraft)
  const quoteStatus = useAppSelector(selectQuoteStatus)
  const {
    data: nearbyVenues = [],
    isError: hasLiveVenueError,
    isLoading: isLoadingLiveVenues,
  } = useGetNearbyVenuesQuery()

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
      // This tool returns structured room data to the model so it can answer
      // capacity, price, and equipment questions without reading the DOM.
      const roomName = resolveRoomName(getStringParam(params, 'roomName'))
      const roomInfo = getRoomByName(roomName)

      dispatch(agentQueryRecorded(roomName))

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
      // The assistant may prefill the form, but final submission stays with the user.
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
      // Availability is shared by the chat flow and manual quote form submission.
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

  return (
    <main className="venue-page">
      <section className="venue-page__hero">
        <p className="venue-page__eyebrow">spaces360 prototype</p>
        <h1 className="venue-page__title">Venue XYZ</h1>
        <p className="venue-page__description">
          This page exposes venue actions through a local tool registry so the AI
          assistant can call them without a browser extension.
        </p>
      </section>

      <div className="venue-page__grid">
        <div className="venue-page__primary">
          <section className="venue-panel" aria-labelledby="available-rooms-title">
            <div className="venue-panel__header">
              <h2 id="available-rooms-title" className="venue-panel__title">
                Available Rooms
              </h2>
              <p className="venue-panel__subtitle">
                Local room data exposed to the registered agent tools.
              </p>
            </div>

            <ul className="room-list">
              {Object.entries(venueRooms).map(([roomName, roomInfo]) => (
                <li className="room-card" key={roomName}>
                  <div className="room-card__header">
                    <h3 className="room-card__name">{roomName}</h3>
                    <span className="room-card__capacity">{roomInfo.capacity} guests</span>
                  </div>

                  <dl className="room-card__details">
                    <div>
                      <dt>Price per day</dt>
                      <dd>{roomInfo.pricePerDay.toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt>Projector</dt>
                      <dd>{roomInfo.hasProjector ? 'Available' : 'Not available'}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          </section>

          <section className="venue-panel" aria-labelledby="live-venues-title">
            <div className="venue-panel__header">
              <h2 id="live-venues-title" className="venue-panel__title">
                Nearby Live Venues
              </h2>
              <p className="venue-panel__subtitle">
                OpenStreetMap results for hotels and event venues in Jena.
              </p>
            </div>

            {isLoadingLiveVenues && (
              <p className="live-venue-status">Loading live venue source...</p>
            )}

            {hasLiveVenueError && (
              <p className="live-venue-status live-venue-status--error">
                Live venue source is unavailable right now.
              </p>
            )}

            {!isLoadingLiveVenues && !hasLiveVenueError && nearbyVenues.length === 0 && (
              <p className="live-venue-status">No nearby venues returned from the live source.</p>
            )}

            {nearbyVenues.length > 0 && (
              <ul className="live-venue-list">
                {nearbyVenues.map((venue) => (
                  <li className="live-venue-list__item" key={venue.id}>
                    <span>{venue.name}</span>
                    <small>{venue.category}</small>
                  </li>
                ))}
              </ul>
            )}
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
                This form is agent-ready. The AI can fill it out, but requires your
                click to submit.
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

      <AgentChat />
    </main>
  )
}
