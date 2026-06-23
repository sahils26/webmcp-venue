import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setupStore } from '../../../app/store'
import venueCatalog from '../../../data/venueSearchResults.json'
import { httpClient } from '../../../services/api/httpClient'
import { venueApi } from '../venueApi'

vi.mock('../../../services/api/httpClient', () => ({
  httpClient: {
    request: vi.fn(),
  },
}))

const mockedHttpRequest = vi.mocked(httpClient.request)

function createAxiosResponse(data: unknown): Awaited<ReturnType<typeof httpClient.request>> {
  return { data } as Awaited<ReturnType<typeof httpClient.request>>
}

describe('venueApi', () => {
  beforeEach(() => {
    mockedHttpRequest.mockReset()
  })

  it('loads and normalizes nearby venues through RTK Query', async () => {
    mockedHttpRequest.mockResolvedValue(
      createAxiosResponse({
        elements: [
          {
            id: 123,
            lat: 50.9271,
            lon: 11.5892,
            tags: { name: 'Jena Convention Hotel', tourism: 'hotel' },
          },
        ],
      }),
    )

    const store = setupStore()
    const result = await store.dispatch(venueApi.endpoints.getNearbyVenues.initiate())

    expect(result.data).toEqual([
      {
        id: 123,
        name: 'Jena Convention Hotel',
        latitude: 50.9271,
        longitude: 11.5892,
        category: 'hotel',
      },
    ])
    expect(mockedHttpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        params: expect.objectContaining({
          data: expect.stringContaining('area["name"="Jena"]'),
        }),
        url: 'https://overpass-api.de/api/interpreter',
      }),
    )
  })

  it('loads the backend venue catalog', async () => {
    mockedHttpRequest.mockResolvedValue(createAxiosResponse(venueCatalog))

    const store = setupStore()
    const result = await store.dispatch(venueApi.endpoints.getVenueCatalog.initiate())

    expect(result.data?.venues).toHaveLength(5)
    expect(mockedHttpRequest).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET', url: '/api/venues' }),
    )
  })

  it('checks backend availability for one venue and date', async () => {
    mockedHttpRequest.mockResolvedValue(
      createAxiosResponse({
        venue_id: 'grand-hall',
        date: '2026-06-22',
        available: true,
        message: 'grand-hall is available on 2026-06-22.',
      }),
    )

    const store = setupStore()
    const result = await store.dispatch(
      venueApi.endpoints.checkVenueAvailability.initiate({
        venueId: 'grand-hall',
        date: '2026-06-22',
      }),
    )

    expect(result.data?.available).toBe(true)
    expect(mockedHttpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        params: { date: '2026-06-22' },
        url: '/api/venues/grand-hall/availability',
      }),
    )
  })

  it('submits quote holds and confirmed bookings through backend mutations', async () => {
    mockedHttpRequest
      .mockResolvedValueOnce(
        createAxiosResponse({
          id: 1,
          room_name: 'The Grand Hall',
          venue_id: 'grand-hall',
          date: '2026-06-22',
          email: 'planner@example.com',
          status: 'new',
          created_at: '2026-06-20T12:00:00Z',
        }),
      )
      .mockResolvedValueOnce(
        createAxiosResponse({
          id: 2,
          venue_id: 'grand-hall',
          date: '2026-06-23',
          contact_name: 'Planner',
          contact_email: 'planner@example.com',
          status: 'confirmed',
          created_at: '2026-06-20T12:00:00Z',
        }),
      )

    const store = setupStore()
    const quote = await store.dispatch(
      venueApi.endpoints.createQuote.initiate({
        room_name: 'The Grand Hall',
        date: '2026-06-22',
        email: 'planner@example.com',
      }),
    )
    const booking = await store.dispatch(
      venueApi.endpoints.createBooking.initiate({
        venue_id: 'grand-hall',
        date: '2026-06-23',
        contact_name: 'Planner',
        contact_email: 'planner@example.com',
      }),
    )

    expect(quote.data?.status).toBe('new')
    expect(booking.data?.status).toBe('confirmed')
    expect(mockedHttpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ room_name: 'The Grand Hall' }),
        method: 'POST',
        url: '/api/quotes',
      }),
    )
    expect(mockedHttpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ venue_id: 'grand-hall' }),
        method: 'POST',
        url: '/api/bookings',
      }),
    )
  })

  it('returns a normalized RTK Query error when the venue source fails', async () => {
    mockedHttpRequest.mockRejectedValue(new Error('Network unavailable'))

    const store = setupStore()
    const result = await store.dispatch(venueApi.endpoints.getNearbyVenues.initiate())

    expect(result.error).toMatchObject({
      status: 'UNKNOWN_ERROR',
      message: 'Network unavailable',
    })
  })
})
