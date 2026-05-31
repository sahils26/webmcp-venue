import { type ChangeEvent, type FormEvent } from 'react'
import type { QuoteDraft } from '../../types/venue'
import QuoteForm from './QuoteForm'
import './QuoteRequestSection.scss'

interface QuoteRequestSectionProps {
  quoteDraft: QuoteDraft
  quoteStatus: string | null
  onQuoteFieldChange: (event: ChangeEvent<HTMLInputElement>) => void
  onQuoteSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export default function QuoteRequestSection({
  quoteDraft,
  quoteStatus,
  onQuoteFieldChange,
  onQuoteSubmit,
}: QuoteRequestSectionProps) {
  return (
    <section
      className="quote-section"
      id="quote-request-section"
      aria-labelledby="quote-section-title"
    >
      <div className="quote-section__inner">
        <div className="quote-section__copy">
          <p className="quote-section__eyebrow">Quote request</p>
          <h2 className="quote-section__title" id="quote-section-title">
            Request a Quote
          </h2>
          <p className="quote-section__body">
            Choose a venue, pick an available date, and add the email where our team should
            send the next steps.
          </p>
          <dl className="quote-section__details" aria-label="Quote request details">
            <div>
              <dt>Availability check</dt>
              <dd>Runs before submission</dd>
            </div>
            <div>
              <dt>Submission</dt>
              <dd>Sent only after you click submit</dd>
            </div>
          </dl>
        </div>

        <div className="quote-section__form-panel">
          <QuoteForm
            idPrefix="homepage-quote"
            quoteDraft={quoteDraft}
            quoteStatus={quoteStatus}
            onQuoteFieldChange={onQuoteFieldChange}
            onQuoteSubmit={onQuoteSubmit}
            submitButtonId="homepage-quote-submit"
          />
        </div>
      </div>
    </section>
  )
}
