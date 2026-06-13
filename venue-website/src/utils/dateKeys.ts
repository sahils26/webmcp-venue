/**
 * Month lookup for natural language dates supplied by users or the model.
 */
const monthNumbers: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
}

/**
 * Builds a normalized ISO date key after validating that the date actually exists.
 *
 * @param year - Full four-digit year, for example 2026.
 * @param month - One-based month number from 1 to 12.
 * @param day - One-based day of the month.
 * @returns A yyyy-mm-dd string, or an empty string when the date is invalid.
 */
export function toDateKey(year: number, month: number, day: number): string {
  const parsedDate = new Date(Date.UTC(year, month - 1, day))

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    return ''
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function getTodayDateKey(date = new Date()): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export function addDaysToDateKey(dateKey: string, dayOffset: number): string {
  const parsedDate = normalizeDateKey(dateKey)

  if (!parsedDate) {
    return ''
  }

  const [year, month, day] = parsedDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + dayOffset))

  return toDateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
}

export function getNextOpenDateKey(
  bookedDateKeys: string[],
  startDateKey = getTodayDateKey(),
  maxLookaheadDays = 3650,
): string {
  const startDate = normalizeDateKey(startDateKey)

  if (!startDate) {
    return ''
  }

  const bookedDateSet = new Set(bookedDateKeys)

  for (let dayOffset = 0; dayOffset <= maxLookaheadDays; dayOffset += 1) {
    const candidateDate = addDaysToDateKey(startDate, dayOffset)

    if (candidateDate && !bookedDateSet.has(candidateDate)) {
      return candidateDate
    }
  }

  return ''
}

/**
 * Accepts model-friendly dates like "2026-05-15" or "May 15th, 2026"
 * and returns the yyyy-mm-dd key used by booking lookups.
 *
 * @param rawDate - Unknown user or model input to normalize.
 * @returns A yyyy-mm-dd string, or an empty string when parsing fails.
 */
export function normalizeDateKey(rawDate: unknown): string {
  if (typeof rawDate !== 'string') {
    return ''
  }

  const date = rawDate.trim()
  const isoDateMatch = date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)

  if (isoDateMatch) {
    const [, year, month, day] = isoDateMatch
    return toDateKey(Number(year), Number(month), Number(day))
  }

  const monthDateMatch = date.match(
    /^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/i,
  )

  if (monthDateMatch) {
    const [, monthName, day, year] = monthDateMatch
    const month = monthNumbers[monthName.toLowerCase()]

    if (month) {
      return toDateKey(Number(year), month, Number(day))
    }
  }

  return ''
}
