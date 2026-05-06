import { describe, expect, it } from 'vitest'
import { normalizeDateKey, toDateKey } from '../dateKeys'

describe('date key utilities', () => {
  it('creates a normalized yyyy-mm-dd key for valid dates', () => {
    expect(toDateKey(2026, 5, 7)).toBe('2026-05-07')
  })

  it('returns an empty string for impossible calendar dates', () => {
    expect(toDateKey(2026, 2, 31)).toBe('')
  })

  it('normalizes ISO-like date input from users and models', () => {
    expect(normalizeDateKey('2026-5-7')).toBe('2026-05-07')
  })

  it('normalizes natural language month dates', () => {
    expect(normalizeDateKey('May 15th, 2026')).toBe('2026-05-15')
  })

  it('returns an empty string for unsupported input', () => {
    expect(normalizeDateKey(undefined)).toBe('')
    expect(normalizeDateKey('next Friday')).toBe('')
  })
})
