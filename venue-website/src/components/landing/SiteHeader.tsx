import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import './SiteHeader.scss'

export default function SiteHeader() {
  const [showLangNotice, setShowLangNotice] = useState(false)
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current)
      }
    }
  }, [])

  const handleGermanClick = () => {
    setShowLangNotice(true)
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current)
    }
    dismissTimer.current = setTimeout(() => setShowLangNotice(false), 5000)
  }

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="site-header__logo" to="/">
          spaces360
        </Link>

        <nav className="site-header__nav" aria-label="Main navigation">
          <Link to="/#venues" className="site-header__nav-link">
            VENUES
          </Link>
          <Link to="/#quote-request-section" className="site-header__nav-link">
            RENT A SPACE
          </Link>
        </nav>

        <div className="site-header__lang" aria-label="Language switcher">
          <button className="site-header__lang-btn site-header__lang-btn--active" type="button">
            EN
          </button>
          <span className="site-header__lang-sep" aria-hidden="true">
            |
          </span>
          <button
            className="site-header__lang-btn"
            type="button"
            onClick={handleGermanClick}
            aria-expanded={showLangNotice}
          >
            DE
          </button>

          {showLangNotice && (
            <div className="site-header__lang-notice" role="status">
              <svg
                className="site-header__lang-notice-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              <p className="site-header__lang-notice-text">
                We currently support English only. German (Deutsch) is coming soon!
              </p>
              <button
                className="site-header__lang-notice-close"
                type="button"
                onClick={() => setShowLangNotice(false)}
                aria-label="Dismiss language notice"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
