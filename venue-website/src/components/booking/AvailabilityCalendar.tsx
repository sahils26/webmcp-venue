import { useMemo, useState } from 'react'
import { getNextOpenDateKey, getTodayDateKey, toDateKey } from '../../utils/dateKeys'
import './AvailabilityCalendar.scss'

interface AvailabilityCalendarProps {
  availableDates?: string[]
  selectedDate: string
  onDateSelect: (date: string) => void
  bookedDates?: string[]
  disabled?: boolean
  disabledMessage?: string
  emptyMessage?: string
  minDate?: string
}

interface CalendarMonth {
  year: number
  monthIndex: number
}

interface ParsedDateKey {
  year: number
  month: number
  day: number
}

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  timeZone: 'UTC',
  year: 'numeric',
})

const dayFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
  year: 'numeric',
})

function parseDateKey(dateKey: string): ParsedDateKey | null {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) {
    return null
  }

  const [, year, month, day] = match
  const parsed = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
  }

  return toDateKey(parsed.year, parsed.month, parsed.day) === dateKey ? parsed : null
}

function getMonthFromDateKey(dateKey: string): CalendarMonth | null {
  const parsedDate = parseDateKey(dateKey)

  return parsedDate
    ? { year: parsedDate.year, monthIndex: parsedDate.month - 1 }
    : null
}

function getFallbackMonth(): CalendarMonth {
  const today = new Date()

  return {
    year: today.getFullYear(),
    monthIndex: today.getMonth(),
  }
}

function addMonths(month: CalendarMonth, monthOffset: number): CalendarMonth {
  const date = new Date(Date.UTC(month.year, month.monthIndex + monthOffset, 1))

  return {
    year: date.getUTCFullYear(),
    monthIndex: date.getUTCMonth(),
  }
}

function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
}

function formatLongDate(dateKey: string): string {
  return dayFormatter.format(new Date(`${dateKey}T00:00:00Z`))
}

function getFirstSelectableDate(
  availableDates: string[] | undefined,
  bookedDates: Set<string>,
  minDate?: string,
  disabled = false,
): string {
  if (disabled) {
    return ''
  }

  if (Array.isArray(availableDates)) {
    return [...availableDates]
      .sort()
      .find((date) => !bookedDates.has(date) && (!minDate || date >= minDate)) ?? ''
  }

  return getNextOpenDateKey(Array.from(bookedDates), minDate ?? getTodayDateKey())
}

export default function AvailabilityCalendar({
  availableDates,
  selectedDate,
  onDateSelect,
  bookedDates = [],
  disabled = false,
  disabledMessage = 'Select a venue first to choose a date.',
  emptyMessage = 'No available dates for the selected venue.',
  minDate,
}: AvailabilityCalendarProps) {
  const availableDateSet = useMemo(() => new Set(availableDates), [availableDates])
  const bookedDateSet = useMemo(() => new Set(bookedDates), [bookedDates])
  const hasLimitedAvailability = Array.isArray(availableDates)
  const firstSelectableDate = useMemo(
    () => getFirstSelectableDate(availableDates, bookedDateSet, minDate, disabled),
    [availableDates, bookedDateSet, disabled, minDate],
  )
  const initialMonth =
    getMonthFromDateKey(selectedDate) ??
    getMonthFromDateKey(firstSelectableDate) ??
    getMonthFromDateKey(minDate ?? '') ??
    getFallbackMonth()
  const [visibleMonth, setVisibleMonth] = useState<CalendarMonth>(initialMonth)

  const calendarDays = useMemo(() => {
    const firstWeekday = new Date(
      Date.UTC(visibleMonth.year, visibleMonth.monthIndex, 1),
    ).getUTCDay()
    const daysInCurrentMonth = getDaysInMonth(
      visibleMonth.year,
      visibleMonth.monthIndex,
    )
    const previousMonth = addMonths(visibleMonth, -1)
    const daysInPreviousMonth = getDaysInMonth(
      previousMonth.year,
      previousMonth.monthIndex,
    )

    return Array.from({ length: 42 }, (_, index) => {
      const dayOffset = index - firstWeekday + 1
      let year = visibleMonth.year
      let month = visibleMonth.monthIndex + 1
      let day = dayOffset
      let isCurrentMonth = true

      if (dayOffset < 1) {
        year = previousMonth.year
        month = previousMonth.monthIndex + 1
        day = daysInPreviousMonth + dayOffset
        isCurrentMonth = false
      } else if (dayOffset > daysInCurrentMonth) {
        const nextMonth = addMonths(visibleMonth, 1)
        year = nextMonth.year
        month = nextMonth.monthIndex + 1
        day = dayOffset - daysInCurrentMonth
        isCurrentMonth = false
      }

      return {
        dateKey: toDateKey(year, month, day),
        day,
        isCurrentMonth,
      }
    })
  }, [visibleMonth])

  const monthLabel = monthFormatter.format(
    new Date(Date.UTC(visibleMonth.year, visibleMonth.monthIndex, 1)),
  )

  return (
    <div
      className={`availability-calendar${disabled ? ' availability-calendar--disabled' : ''}`}
    >
      <div className="availability-calendar__header">
        <button
          className="availability-calendar__nav"
          type="button"
          onClick={() => setVisibleMonth((month) => addMonths(month, -1))}
          aria-label="Show previous month"
        >
          <span aria-hidden="true">‹</span>
        </button>
        <p className="availability-calendar__month">{monthLabel}</p>
        <button
          className="availability-calendar__nav"
          type="button"
          onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
          aria-label="Show next month"
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>

      <div className="availability-calendar__weekdays" aria-hidden="true">
        {weekdayLabels.map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>

      <div className="availability-calendar__grid" role="grid" aria-label="Venue availability calendar">
        {calendarDays.map(({ dateKey, day, isCurrentMonth }) => {
          const isAvailable = hasLimitedAvailability
            ? availableDateSet.has(dateKey)
            : true
          const isBooked = bookedDateSet.has(dateKey)
          const isPast = Boolean(minDate && dateKey < minDate)
          const isSelected = selectedDate === dateKey
          const isSelectable = !disabled && isCurrentMonth && isAvailable && !isBooked && !isPast
          const statusLabel = disabled
            ? 'locked until a venue is selected'
            : isBooked
            ? 'booked'
            : isSelectable
              ? 'available'
              : 'unavailable'

          return (
            <button
              className={[
                'availability-calendar__day',
                !isCurrentMonth ? 'availability-calendar__day--muted' : '',
                !disabled && isCurrentMonth && isAvailable && !isPast
                  ? 'availability-calendar__day--available'
                  : '',
                isBooked ? 'availability-calendar__day--booked' : '',
                isSelected ? 'availability-calendar__day--selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              key={dateKey}
              type="button"
              disabled={!isSelectable}
              aria-pressed={isSelected}
              aria-label={`${formatLongDate(dateKey)}, ${statusLabel}`}
              onClick={() => onDateSelect(dateKey)}
            >
              <span>{day}</span>
            </button>
          )
        })}
      </div>

      <div className="availability-calendar__legend" aria-label="Availability legend">
        <span>
          <i className="availability-calendar__legend-mark availability-calendar__legend-mark--available" />
          Available
        </span>
        <span>
          <i className="availability-calendar__legend-mark availability-calendar__legend-mark--booked" />
          Booked
        </span>
      </div>

      {disabled && (
        <p className="availability-calendar__empty" aria-live="polite">
          {disabledMessage}
        </p>
      )}

      {!disabled && !firstSelectableDate && (
        <p className="availability-calendar__empty" aria-live="polite">
          {emptyMessage}
        </p>
      )}
    </div>
  )
}
