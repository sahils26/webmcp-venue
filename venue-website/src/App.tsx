import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAppSelector } from './app/hooks'
import AgentChat from './components/AgentChat'
import VenueAgentTools from './components/VenueAgentTools'
import { venueSearchResults } from './data/venueSearchResults'
import { selectQuoteHandoffRequestKey } from './features/quote/quoteSlice'
import VenueDetailPage from './pages/VenueDetailPage'
import VenuePage from './pages/VenuePage'

function RouteScrollRestoration() {
  const location = useLocation()

  useEffect(() => {
    if (location.hash) {
      window.setTimeout(() => {
        document.querySelector(location.hash)?.scrollIntoView({ behavior: 'smooth' })
      }, 0)
      return
    }

    window.scrollTo?.({ top: 0, left: 0, behavior: 'auto' })
  }, [location.pathname, location.hash])

  return null
}

function getPageContext(pathname: string): string {
  const detailMatch = pathname.match(/^\/venues\/([^/]+)$/)
  const venue = detailMatch
    ? venueSearchResults.find((candidate) => candidate.id === detailMatch[1])
    : undefined

  if (venue) {
    return `Current page context: the user is viewing the detail page for ${venue.name}. If they ask about "this venue" or "this space", use ${venue.name}.`
  }

  return 'Current page context: the user is browsing the spaces360 venue website.'
}

function AppContent() {
  const location = useLocation()
  const quoteHandoffRequestKey = useAppSelector(selectQuoteHandoffRequestKey)

  return (
    <>
      <RouteScrollRestoration />
      <VenueAgentTools />
      <Routes>
        <Route path="/" element={<VenuePage />} />
        <Route path="/venues/:venueId" element={<VenueDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AgentChat
        minimizeRequestKey={quoteHandoffRequestKey}
        pageContext={getPageContext(location.pathname)}
      />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}
