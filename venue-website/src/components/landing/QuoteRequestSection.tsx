import { type ChangeEvent, type FormEvent } from 'react'
import type { QuoteDraft } from '../../types/venue'
import QuoteForm, { type VenueSelectOption } from './QuoteForm'
import './QuoteRequestSection.scss'

interface QuoteRequestSectionProps {
  quoteDraft: QuoteDraft
  quoteStatus: string | null
  onQuoteFieldChange: (event: ChangeEvent<HTMLInputElement>) => void
  onQuoteSubmit: (event: FormEvent<HTMLFormElement>) => void
  availableDates?: string[]
  bookedDates?: string[]
  calendarEmptyMessage?: string
  calendarDisabledMessage?: string
  dateMin?: string
  isDateSelectionEnabled?: boolean
  onQuoteDateSelect?: (date: string) => void
  onVenueSelect?: (venueName: string) => void
  venueOptions?: VenueSelectOption[]
}

export default function QuoteRequestSection({
  quoteDraft,
  quoteStatus,
  onQuoteFieldChange,
  onQuoteSubmit,
  availableDates,
  bookedDates,
  calendarEmptyMessage,
  calendarDisabledMessage,
  dateMin,
  isDateSelectionEnabled = true,
  onQuoteDateSelect,
  onVenueSelect,
  venueOptions,
}: QuoteRequestSectionProps) {
  return (
    <section
      className="quote-section"
      id="quote-request-section"
      aria-labelledby="quote-section-title"
    >
      <div className="quote-section__inner">
        <div className="quote-section__header">
          <p className="quote-section__eyebrow">Quote request</p>
          <h2 className="quote-section__title" id="quote-section-title">
            Request a Quote
          </h2>
          <p className="quote-section__body">
            Choose a venue, pick an available date, and add the email where our team should
            send the next steps.
          </p>
        </div>

        <div className="quote-section__workspace">
          <div className="quote-section__form-panel">
            <QuoteForm
              idPrefix="homepage-quote"
              quoteDraft={quoteDraft}
              quoteStatus={quoteStatus}
              onQuoteFieldChange={onQuoteFieldChange}
              onQuoteSubmit={onQuoteSubmit}
              availableDates={availableDates}
              bookedDates={bookedDates}
              calendarDisabledMessage={calendarDisabledMessage}
              calendarEmptyMessage={calendarEmptyMessage}
              dateHelpText="All future dates are open unless already booked."
              dateMin={dateMin}
              isDateSelectionEnabled={isDateSelectionEnabled}
              onQuoteDateSelect={onQuoteDateSelect}
              onVenueSelect={onVenueSelect}
              roomLabel="Venue"
              roomPlaceholder="Search or choose a venue"
              showCalendar
              submitButtonId="homepage-quote-submit"
              venueOptions={venueOptions}
              noValidate
            />
          </div>

          <aside className="quote-section__support" aria-label="Booking support">
            <dl className="quote-section__details" aria-label="Quote request details">
              <div>
                <dt>Venue choices</dt>
                <dd>{venueOptions?.length ?? 0} curated spaces</dd>
              </div>
              <div>
                <dt>Date hold</dt>
                <dd>Blocked after payment</dd>
              </div>
              <div>
                <dt>Confirmation</dt>
                <dd>Document sent by email</dd>
              </div>
              <div>
                <dt>Planning help</dt>
                <dd>Team follow-up included</dd>
              </div>
            </dl>
          </aside>
        </div>
      </div>
    </section>
  )
}
