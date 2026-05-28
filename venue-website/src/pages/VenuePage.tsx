import { type ChangeEvent, type FormEvent, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import ContactSection from '../components/landing/ContactSection'
import GallerySection from '../components/landing/GallerySection'
import HeroSection from '../components/landing/HeroSection'
import QuoteRequestSection from '../components/landing/QuoteRequestSection'
import SiteFooter from '../components/landing/SiteFooter'
import SiteHeader from '../components/landing/SiteHeader'
import { venueSearchResults } from '../data/venueSearchResults'
import {
  isQuoteDraftField,
  quoteDraftFieldChanged,
  selectQuoteHandoffRequestKey,
  quoteStatusSet,
  selectQuoteDraft,
  selectQuoteStatus,
} from '../features/quote/quoteSlice'
import { getRoomAvailability } from '../services/venueAvailability'
import './style/VenuePage.scss'

export default function VenuePage() {
  const dispatch = useAppDispatch()
  const quoteDraft = useAppSelector(selectQuoteDraft)
  const quoteFormHandoffKey = useAppSelector(selectQuoteHandoffRequestKey)
  const quoteStatus = useAppSelector(selectQuoteStatus)

  useEffect(() => {
    if (!quoteFormHandoffKey) {
      return
    }

    document
      .getElementById('quote-request-section')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    document.getElementById('homepage-quote-submit')?.focus({ preventScroll: true })
  }, [quoteFormHandoffKey])

  const handleQuoteFieldChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    if (isQuoteDraftField(name)) {
      dispatch(quoteDraftFieldChanged({ name, value }))
    }
  }

  const handleQuoteSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const availability = getRoomAvailability(quoteDraft.roomName, quoteDraft.date)
    if (!availability.success || !availability.available) {
      dispatch(quoteStatusSet(`${availability.message} Quote request was not sent.`))
      return
    }
    dispatch(
      quoteStatusSet(
        `Quote requested for ${availability.roomName} on ${availability.date} by ${quoteDraft.email}.`,
      ),
    )
  }

  return (
    <>
      {/* 1. Sticky navigation */}
      <SiteHeader />

      {/* 2. Full-width hero */}
      <HeroSection />

      {/* 3. Venue cards grid */}
      <GallerySection venues={venueSearchResults} />

      {/* 4. Contact section */}
      <ContactSection />

      {/* 5. Homepage quote form */}
      <QuoteRequestSection
        quoteDraft={quoteDraft}
        quoteStatus={quoteStatus}
        onQuoteFieldChange={handleQuoteFieldChange}
        onQuoteSubmit={handleQuoteSubmit}
      />

      {/* 6. Footer */}
      <SiteFooter />
    </>
  )
}
