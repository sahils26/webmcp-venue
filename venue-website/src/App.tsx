import { useEffect, useMemo } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAppSelector } from './app/hooks'
import AgentChat from './components/AgentChat'
import VenueAgentTools from './components/VenueAgentTools'
import {
  getVenueSearchResultsFromCatalog,
  venueSearchResults,
} from './data/venueSearchResults'
import { selectQuoteHandoffRequestKey } from './features/quote/quoteSlice'
import { useGetVenueCatalogQuery } from './features/venues/venueApi'
import VenueDetailPage from './pages/VenueDetailPage'
import VenuePage from './pages/VenuePage'
import type { VenueSearchResult } from './types/venue'

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

function getPageContext(pathname: string, venues: VenueSearchResult[]): string {
  const detailMatch = pathname.match(/^\/venues\/([^/]+)$/)
  const venue = detailMatch
    ? venues.find((candidate) => candidate.id === detailMatch[1])
    : undefined

  if (venue) {
    return `Current page context: the user is viewing the detail page for ${venue.name}. If they ask about "this venue" or "this space", use ${venue.name}.`
  }

  return 'Current page context: the user is browsing the spaces360 venue website.'
}

function AppContent() {
  const location = useLocation()
  const quoteHandoffRequestKey = useAppSelector(selectQuoteHandoffRequestKey)
  const { data: venueCatalog } = useGetVenueCatalogQuery()
  const venues = useMemo(
    () =>
      venueCatalog
        ? getVenueSearchResultsFromCatalog(venueCatalog)
        : venueSearchResults,
    [venueCatalog],
  )

  return (
    <>
      <RouteScrollRestoration />
      <VenueAgentTools venues={venues} />
      <Routes>
        <Route path="/" element={<VenuePage venues={venues} />} />
        <Route path="/venues/:venueId" element={<VenueDetailPage venues={venues} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AgentChat
        minimizeRequestKey={quoteHandoffRequestKey}
        pageContext={getPageContext(location.pathname, venues)}
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
