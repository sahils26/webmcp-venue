import './HeroSection.scss'

export default function HeroSection() {
  return (
    <section className="hero-section" aria-labelledby="hero-headline">
      <div className="hero-section__overlay" aria-hidden="true" />

      <div className="hero-section__content">
        <p className="hero-section__eyebrow">spaces360</p>

        <h1 id="hero-headline" className="hero-section__headline">
          TURN YOUR EVENT INTO A<br />MEMORABLE EXPERIENCE.
        </h1>

        <p className="hero-section__subheading">
          Find the perfect space for your next event
        </p>

        <a href="#venues" className="hero-section__cta">
          Explore Spaces ↓
        </a>
      </div>
    </section>
  )
}
