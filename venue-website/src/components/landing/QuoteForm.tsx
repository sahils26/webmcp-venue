import { type ChangeEvent, type FormEvent } from 'react'
import type { QuoteDraft } from '../../types/venue'

interface QuoteFormProps {
  idPrefix: string
  quoteDraft: QuoteDraft
  quoteStatus: string | null
  onQuoteFieldChange: (event: ChangeEvent<HTMLInputElement>) => void
  onQuoteSubmit: (event: FormEvent<HTMLFormElement>) => void
  submitButtonId?: string
}

export default function QuoteForm({
  idPrefix,
  quoteDraft,
  quoteStatus,
  onQuoteFieldChange,
  onQuoteSubmit,
  submitButtonId,
}: QuoteFormProps) {
  const roomInputId = `${idPrefix}-room`
  const dateInputId = `${idPrefix}-date`
  const emailInputId = `${idPrefix}-email`

  return (
    <>
      <form className="quote-form" onSubmit={onQuoteSubmit}>
        <label className="quote-form__field" htmlFor={roomInputId}>
          <span>Room Name</span>
          <input
            id={roomInputId}
            type="text"
            name="roomName"
            value={quoteDraft.roomName}
            onChange={onQuoteFieldChange}
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
            required
          />
        </label>
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
