import { type ChangeEvent, type FormEvent, useMemo, useState } from 'react'
import AvailabilityCalendar from '../booking/AvailabilityCalendar'
import type { QuoteDraft } from '../../types/venue'
import './QuoteForm.scss'

export interface VenueSelectOption {
  id: string
  name: string
  location: string
  capacity: number
  priceLabel: string
}

interface QuoteFormProps {
  idPrefix: string
  quoteDraft: QuoteDraft
  quoteStatus: string | null
  onQuoteFieldChange: (event: ChangeEvent<HTMLInputElement>) => void
  onQuoteSubmit: (event: FormEvent<HTMLFormElement>) => void
  availableDates?: string[]
  bookedDates?: string[]
  calendarEmptyMessage?: string
  calendarDisabledMessage?: string
  dateHelpText?: string
  dateMin?: string
  datePlaceholder?: string
  isDateSelectionEnabled?: boolean
  noValidate?: boolean
  onQuoteDateSelect?: (date: string) => void
  onVenueSelect?: (venueName: string) => void
  roomLabel?: string
  roomPlaceholder?: string
  roomReadOnly?: boolean
  showCalendar?: boolean
  submitButtonId?: string
  submitButtonLabel?: string
  venueOptions?: VenueSelectOption[]
}

export default function QuoteForm({
  idPrefix,
  quoteDraft,
  quoteStatus,
  onQuoteFieldChange,
  onQuoteSubmit,
  availableDates,
  bookedDates = [],
  calendarEmptyMessage,
  calendarDisabledMessage,
  dateHelpText,
  dateMin,
  datePlaceholder = 'Select a date from the calendar',
  isDateSelectionEnabled = true,
  noValidate = false,
  onQuoteDateSelect,
  onVenueSelect,
  roomLabel = 'Venue',
  roomPlaceholder,
  roomReadOnly = false,
  showCalendar = false,
  submitButtonId,
  submitButtonLabel = 'Submit Quote Request',
  venueOptions = [],
}: QuoteFormProps) {
  const [isVenueMenuOpen, setIsVenueMenuOpen] = useState(false)
  const roomInputId = `${idPrefix}-room`
  const dateInputId = `${idPrefix}-date`
  const dateHintId = `${idPrefix}-date-hint`
  const emailInputId = `${idPrefix}-email`
  const venueMenuId = `${idPrefix}-venue-options`
  const shouldShowVenueMenu = venueOptions.length > 0 && !roomReadOnly
  const filteredVenueOptions = useMemo(() => {
    const searchTerm = quoteDraft.roomName.trim().toLowerCase()

    if (!searchTerm) {
      return venueOptions
    }

    return venueOptions.filter((venueOption) =>
      [venueOption.name, venueOption.location]
        .join(' ')
        .toLowerCase()
        .includes(searchTerm),
    )
  }, [quoteDraft.roomName, venueOptions])
  const shouldShowCalendar = showCalendar || Array.isArray(availableDates)
  const calendarKey = [
    availableDates?.join('|') ?? 'future',
    quoteDraft.roomName || 'no-venue',
    quoteDraft.date || 'empty',
    isDateSelectionEnabled ? 'enabled' : 'disabled',
  ].join('-')
  const dateHintText = isDateSelectionEnabled ? dateHelpText : calendarDisabledMessage
  const isSuccessStatus = quoteStatus?.startsWith('Quote requested for ') ?? false

  const handleCalendarDateSelect = (date: string) => {
    if (!isDateSelectionEnabled) {
      return
    }

    if (onQuoteDateSelect) {
      onQuoteDateSelect(date)
      return
    }

    onQuoteFieldChange({
      target: {
        name: 'date',
        value: date,
      },
    } as ChangeEvent<HTMLInputElement>)
  }

  const handleVenueSelect = (venueName: string) => {
    if (onVenueSelect) {
      onVenueSelect(venueName)
    } else {
      onQuoteFieldChange({
        target: {
          name: 'roomName',
          value: venueName,
        },
      } as ChangeEvent<HTMLInputElement>)
    }

    setIsVenueMenuOpen(false)
  }

  const handleRoomFieldChange = (event: ChangeEvent<HTMLInputElement>) => {
    onQuoteFieldChange(event)

    if (shouldShowVenueMenu) {
      setIsVenueMenuOpen(true)
    }
  }

  return (
    <>
      <form className="quote-form" noValidate={noValidate} onSubmit={onQuoteSubmit}>
        <div className="quote-form__field">
          <label htmlFor={roomInputId}>{roomLabel}</label>
          <div className="quote-form__combobox">
            <input
              id={roomInputId}
              type="text"
              name="roomName"
              value={quoteDraft.roomName}
              onBlur={() => window.setTimeout(() => setIsVenueMenuOpen(false), 120)}
              onChange={handleRoomFieldChange}
              onFocus={() => shouldShowVenueMenu && setIsVenueMenuOpen(true)}
              placeholder={roomPlaceholder}
              readOnly={roomReadOnly}
              role={shouldShowVenueMenu ? 'combobox' : undefined}
              aria-autocomplete={shouldShowVenueMenu ? 'list' : undefined}
              aria-controls={shouldShowVenueMenu ? venueMenuId : undefined}
              aria-expanded={shouldShowVenueMenu ? isVenueMenuOpen : undefined}
              required
            />
            {shouldShowVenueMenu && (
              <button
                className="quote-form__combobox-toggle"
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setIsVenueMenuOpen((isOpen) => !isOpen)}
                aria-label="Show venue options"
                aria-controls={venueMenuId}
                aria-expanded={isVenueMenuOpen}
              >
                <span aria-hidden="true">⌄</span>
              </button>
            )}
            {shouldShowVenueMenu && isVenueMenuOpen && (
              <div className="quote-form__venue-menu" id={venueMenuId} role="listbox">
                {filteredVenueOptions.length ? (
                  filteredVenueOptions.map((venueOption) => (
                    <button
                      className="quote-form__venue-option"
                      key={venueOption.id}
                      type="button"
                      role="option"
                      aria-selected={quoteDraft.roomName === venueOption.name}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleVenueSelect(venueOption.name)}
                    >
                      <span>{venueOption.name}</span>
                      <small>
                        {venueOption.location} · {venueOption.capacity} guests ·{' '}
                        {venueOption.priceLabel}
                      </small>
                    </button>
                  ))
                ) : (
                  <p className="quote-form__venue-empty">No matching venues</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="quote-form__field quote-form__field--date">
          <label htmlFor={dateInputId}>Date</label>
          <input
            id={dateInputId}
            type="text"
            name="date"
            value={quoteDraft.date}
            aria-describedby={dateHintText ? dateHintId : undefined}
            disabled={!isDateSelectionEnabled}
            placeholder={datePlaceholder}
            readOnly
            required
          />
        </div>
        {dateHintText && (
          <small className="quote-form__hint" id={dateHintId}>
            {dateHintText}
          </small>
        )}
        {shouldShowCalendar && (
          <AvailabilityCalendar
            key={calendarKey}
            availableDates={availableDates}
            bookedDates={bookedDates}
            disabled={!isDateSelectionEnabled}
            disabledMessage={calendarDisabledMessage}
            selectedDate={quoteDraft.date}
            onDateSelect={handleCalendarDateSelect}
            minDate={dateMin}
            emptyMessage={calendarEmptyMessage}
          />
        )}
        <div className="quote-form__field">
          <label htmlFor={emailInputId}>Your Email</label>
          <input
            id={emailInputId}
            type="email"
            name="email"
            value={quoteDraft.email}
            onChange={onQuoteFieldChange}
            required
          />
        </div>
        <div className="quote-form__field">
          <label htmlFor={`${idPrefix}-special`}>Special Requirements</label>
          <textarea
            id={`${idPrefix}-special`}
            name="specialRequirements"
            value={quoteDraft.specialRequirements ?? ''}
            onChange={(e) =>
              onQuoteFieldChange(e as unknown as ChangeEvent<HTMLInputElement>)
            }
            placeholder="e.g. AR equipment, catering, accessibility needs, custom setup..."
            rows={3}
          />
        </div>
        <button className="quote-form__submit" id={submitButtonId} type="submit">
          {submitButtonLabel}
        </button>
      </form>

      {quoteStatus && (
        <div
          className={`quote-status quote-status--${isSuccessStatus ? 'success' : 'error'}`}
          role={isSuccessStatus ? 'status' : 'alert'}
        >
          {quoteStatus}
        </div>
      )}
    </>
  )
}
