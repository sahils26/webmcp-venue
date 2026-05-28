import { Link } from 'react-router-dom'
import './SiteHeader.scss'

export default function SiteHeader() {
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
          <button className="site-header__lang-btn" type="button">
            DE
          </button>
        </div>
      </div>
    </header>
  )
}
