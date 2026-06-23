import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import venueCatalog from '../data/venueSearchResults.json'
import { httpClient } from '../services/api/httpClient'

Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
  configurable: true,
  value: vi.fn(),
})

Object.defineProperty(window, 'scrollTo', {
  configurable: true,
  value: vi.fn(),
})

let quoteId = 0

beforeEach(() => {
  quoteId = 0
  vi.spyOn(httpClient, 'request').mockImplementation(async (config) => {
    if (config.url === '/api/venues') {
      return { data: venueCatalog } as never
    }

    if (config.url?.endsWith('/availability')) {
      const venueId = config.url.split('/').at(-2) ?? ''
      return {
        data: {
          venue_id: venueId,
          date: String(config.params?.date ?? ''),
          available: true,
          message: `${venueId} is available.`,
        },
      } as never
    }

    if (config.url === '/api/quotes' && config.method === 'POST') {
      quoteId += 1
      const payload = config.data as {
        room_name: string
        date: string
        email: string
      }
      return {
        data: {
          ...payload,
          id: quoteId,
          venue_id: payload.room_name.toLowerCase().replace(/^the\s+/, '').replaceAll(' ', '-'),
          status: 'new',
          created_at: '2026-06-20T12:00:00Z',
        },
      } as never
    }

    if (config.url === 'https://overpass-api.de/api/interpreter') {
      return { data: { elements: [] } } as never
    }

    throw new Error(`Unexpected API request in test: ${config.method} ${config.url}`)
  })
})

/**
 * Shared cleanup for component tests.
 *
 * React Testing Library removes mounted trees after each test, while Vitest
 * restores mocked functions and environment variables so tests stay isolated.
 */
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})
