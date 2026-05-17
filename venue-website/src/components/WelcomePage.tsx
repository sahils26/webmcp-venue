import { type FormEvent, type KeyboardEvent, useState } from 'react'
import './style/WelcomePage.scss'

interface WelcomePageProps {
  onSubmit: (message: string) => void
  isLoading?: boolean
}

export default function WelcomePage({ onSubmit, isLoading = false }: WelcomePageProps) {
  const [input, setInput] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedInput = input.trim()
    if (trimmedInput && !isLoading) {
      onSubmit(trimmedInput)
      setInput('')
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  return (
    <div className="welcome-page">
      {/* Animated background */}
      <div className="welcome-page__background">
        <div className="welcome-page__blob welcome-page__blob--1"></div>
        <div className="welcome-page__blob welcome-page__blob--2"></div>
        <div className="welcome-page__blob welcome-page__blob--3"></div>
      </div>

      {/* Main content */}
      <div className="welcome-page__content">
        <div className="welcome-page__container">
          {/* Header with logo */}
          <div className="welcome-page__header">
            <div className="welcome-page__logo-wrapper">
              <div className="welcome-page__logo">
                <span>s3</span>
              </div>
            </div>
            <h1 className="welcome-page__title">spaces360</h1>
            <p className="welcome-page__subtitle">
              AI-Powered Venue Planning Assistant
            </p>
          </div>

          {/* Introduction section */}
          <div className="welcome-page__intro">
            <div className="welcome-page__intro-icon">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              </svg>
            </div>
            <h2 className="welcome-page__intro-title">Welcome</h2>
            <p className="welcome-page__intro-description">
              Tell me what kind of event you are planning, and I can check rooms or dates for you.
            </p>
          </div>

          {/* Features grid */}
          <div className="welcome-page__features">
            <div className="welcome-page__feature">
              <div className="welcome-page__feature-icon">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="1"></circle>
                  <circle cx="19" cy="12" r="1"></circle>
                  <circle cx="5" cy="12" r="1"></circle>
                </svg>
              </div>
              <p className="welcome-page__feature-text">AI-Ready Tools</p>
            </div>
            <div className="welcome-page__feature">
              <div className="welcome-page__feature-icon">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              </div>
              <p className="welcome-page__feature-text">Jena, Germany</p>
            </div>
          </div>

          {/* Input section */}
          <form className="welcome-page__form" onSubmit={handleSubmit}>
            <div className="welcome-page__composer">
              <textarea
                className="welcome-page__input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="I would like a venue for a wedding"
                rows={1}
                disabled={isLoading}
                aria-label="Describe your event"
              />
              <button
                className={`welcome-page__submit ${isLoading ? 'welcome-page__submit--loading' : ''}`}
                type="submit"
                disabled={isLoading || !input.trim()}
                aria-label="Start planning"
              >
                <span className="welcome-page__submit-text">
                  {isLoading ? 'Connecting...' : 'Start Planning'}
                </span>
                <svg
                  className="welcome-page__submit-icon"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
            <p className="welcome-page__hint">
              💡 Try asking about room availability, pricing, or booking a quote
            </p>
          </form>

          {/* Footer */}
          <div className="welcome-page__footer">
            <p className="welcome-page__footer-text">
              Powered by AI • Instant Availability • Seamless Booking
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
