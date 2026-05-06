import { describe, expect, it, vi } from 'vitest'
import { fetchRealVenues } from '../osmApi'

function createFetchResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response
}

describe('OpenStreetMap venue service', () => {
  it('maps Overpass elements into normalized venues', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        createFetchResponse({
          elements: [
            {
              id: 123,
              lat: 50.9271,
              lon: 11.5892,
              tags: { name: 'Jena Convention Hotel', tourism: 'hotel' },
            },
          ],
        }),
      ),
    )

    await expect(fetchRealVenues()).resolves.toEqual([
      {
        id: 123,
        name: 'Jena Convention Hotel',
        latitude: 50.9271,
        longitude: 11.5892,
        category: 'hotel',
      },
    ])
  })

  it('throws when the Overpass endpoint fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createFetchResponse({}, false, 503)))

    await expect(fetchRealVenues()).rejects.toThrow(
      'OpenStreetMap venue lookup failed with 503.',
    )
  })
})
