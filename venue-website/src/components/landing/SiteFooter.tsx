import { Link } from 'react-router-dom'
import './SiteFooter.scss'

const VENUE_LINKS = [
  { id: 'grand-hall', name: 'The Grand Hall' },
  { id: 'skyline-loft', name: 'Skyline Loft' },
  { id: 'atelier-courtyard', name: 'Atelier Courtyard' },
  { id: 'river-conference-suite', name: 'River Conference Suite' },
  { id: 'garden-pavilion', name: 'Garden Pavilion' },
]

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        {/* Brand column */}
        <div className="site-footer__brand">
          <p className="site-footer__logo">spaces360</p>
          <p className="site-footer__tagline">Perfect Spaces for Every Moment</p>
          <p className="site-footer__mission">
            Connecting visionary event planners with extraordinary venues across central Germany.
          </p>
        </div>

        {/* Venues nav */}
        <nav className="site-footer__col" aria-label="Venues footer navigation">
          <h3 className="site-footer__col-title">Our Spaces</h3>
          <ul>
            {VENUE_LINKS.map((venue) => (
              <li key={venue.id}>
                <Link to={`/venues/${venue.id}`}>{venue.name}</Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Company nav */}
        <nav className="site-footer__col" aria-label="Company footer navigation">
          <h3 className="site-footer__col-title">Company</h3>
          <ul>
            <li><Link to="/#venues">Browse Spaces</Link></li>
            <li><Link to="/#quote-request-section">Rent a Space</Link></li>
            <li><Link to="/#contact">Contact Us</Link></li>
            <li><Link to="/">About spaces360</Link></li>
          </ul>
        </nav>

        {/* Contact column */}
        <div className="site-footer__col">
          <h3 className="site-footer__col-title">Contact</h3>
          <div className="site-footer__contact">
            <a
              href="mailto:events@spaces360.de"
              className="site-footer__contact-email"
              aria-label="Email spaces360"
            >
              events@spaces360.de
            </a>
            <p className="site-footer__contact-hours">Mon – Fri, 9:00 – 18:00 CET</p>
          </div>
        </div>
      </div>

      <div className="site-footer__bottom">
        <p className="site-footer__copyright">
          © {new Date().getFullYear()} spaces360. All rights reserved.
        </p>
        <p className="site-footer__credits">
          AI-powered venue discovery
        </p>
      </div>
    </footer>
  )
}
