import { describe, expect, it } from 'vitest'
import { getApiErrorMessage } from './errorMessage'

describe('getApiErrorMessage', () => {
  it('uses FastAPI detail text when present', () => {
    expect(
      getApiErrorMessage(
        { data: { detail: 'The selected venue is already held.' } },
        'Request failed.',
      ),
    ).toBe('The selected venue is already held.')
  })

  it('falls back to a transport error message', () => {
    expect(getApiErrorMessage({ message: 'Network unavailable.' }, 'Request failed.')).toBe(
      'Network unavailable.',
    )
  })

  it.each([null, 'failed', {}, { data: null }, { data: { detail: 409 } }])(
    'uses the fallback for an unsupported error shape: %j',
    (error) => {
      expect(getApiErrorMessage(error, 'Request failed.')).toBe('Request failed.')
    },
  )
})
