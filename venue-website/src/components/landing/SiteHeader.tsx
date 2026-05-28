import './SiteHeader.scss'

export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <a className="site-header__logo" href="#">
          spaces360
        </a>

        <nav className="site-header__nav" aria-label="Main navigation">
          <a href="#venues" className="site-header__nav-link">
            VENUES
          </a>
          <a href="#contact" className="site-header__nav-link">
            RENT A SPACE
          </a>
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
