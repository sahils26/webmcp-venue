import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.scss'
import { AppProvider } from './app/AppProvider'
import VenuePage from './pages/VenuePage'

/**
 * React mount target declared in index.html.
 * Throwing early makes broken HTML/template changes obvious during development.
 */
const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found.')
}

createRoot(rootElement).render(
  <StrictMode>
    <AppProvider>
      <VenuePage />
    </AppProvider>
  </StrictMode>,
)
