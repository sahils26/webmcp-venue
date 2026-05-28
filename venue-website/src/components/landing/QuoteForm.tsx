import { type ChangeEvent, type FormEvent } from 'react'
import type { QuoteDraft } from '../../types/venue'
import './QuoteForm.scss'

interface QuoteFormProps {
  idPrefix: string
  quoteDraft: QuoteDraft
  quoteStatus: string | null
  onQuoteFieldChange: (event: ChangeEvent<HTMLInputElement>) => void
  onQuoteSubmit: (event: FormEvent<HTMLFormElement>) => void
  dateHelpText?: string
  dateMin?: string
  noValidate?: boolean
  roomLabel?: string
  roomReadOnly?: boolean
  submitButtonId?: string
}

export default function QuoteForm({
  idPrefix,
  quoteDraft,
  quoteStatus,
  onQuoteFieldChange,
  onQuoteSubmit,
  dateHelpText,
  dateMin,
  noValidate = false,
  roomLabel = 'Room Name',
  roomReadOnly = false,
  submitButtonId,
}: QuoteFormProps) {
  const roomInputId = `${idPrefix}-room`
  const dateInputId = `${idPrefix}-date`
  const dateHintId = `${idPrefix}-date-hint`
  const emailInputId = `${idPrefix}-email`

  return (
    <>
      <form className="quote-form" noValidate={noValidate} onSubmit={onQuoteSubmit}>
        <label className="quote-form__field" htmlFor={roomInputId}>
          <span>{roomLabel}</span>
          <input
            id={roomInputId}
            type="text"
            name="roomName"
            value={quoteDraft.roomName}
            onChange={onQuoteFieldChange}
            readOnly={roomReadOnly}
            required
          />
        </label>
        <label className="quote-form__field" htmlFor={dateInputId}>
          <span>Date</span>
          <input
            id={dateInputId}
            type="date"
            name="date"
            value={quoteDraft.date}
            onChange={onQuoteFieldChange}
            min={dateMin}
            aria-describedby={dateHelpText ? dateHintId : undefined}
            required
          />
        </label>
        {dateHelpText && (
          <small className="quote-form__hint" id={dateHintId}>
            {dateHelpText}
          </small>
        )}
        <label className="quote-form__field" htmlFor={emailInputId}>
          <span>Your Email</span>
          <input
            id={emailInputId}
            type="email"
            name="email"
            value={quoteDraft.email}
            onChange={onQuoteFieldChange}
            required
          />
        </label>
        <button className="quote-form__submit" id={submitButtonId} type="submit">
          Submit Quote Request
        </button>
      </form>

      {quoteStatus && (
        <div className="quote-status" role="status">
          {quoteStatus}
        </div>
      )}
    </>
  )
}
