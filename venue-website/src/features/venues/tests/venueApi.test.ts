import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setupStore } from '../../../app/store'
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
