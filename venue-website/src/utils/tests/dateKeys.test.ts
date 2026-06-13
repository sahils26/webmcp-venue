import { describe, expect, it } from 'vitest'
import {
  addDaysToDateKey,
  getNextOpenDateKey,
  normalizeDateKey,
  toDateKey,
} from '../dateKeys'

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

  it('adds days across month boundaries', () => {
    expect(addDaysToDateKey('2026-05-31', 1)).toBe('2026-06-01')
  })

  it('finds the first unbooked date from a start date', () => {
    expect(getNextOpenDateKey(['2026-06-03', '2026-06-04'], '2026-06-03')).toBe(
      '2026-06-05',
    )
  })
})
