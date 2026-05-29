import './ContactSection.scss'

export default function ContactSection() {
  return (
    <section className="contact-section" id="contact" aria-labelledby="contact-title">
      <div className="contact-section__inner">
        <div className="contact-section__info">
          <div className="contact-section__info-block">
            <p className="contact-section__info-label">Email us at</p>
            <a
              href="mailto:events@spaces360.de"
              className="contact-section__email"
              aria-label="Email spaces360 events team"
            >
              events@spaces360.de
            </a>
          </div>

          <div className="contact-section__info-block">
            <p className="contact-section__info-label">Available</p>
            <p className="contact-section__info-value">Mon – Fri, 9:00 – 18:00 CET</p>
          </div>

          <a href="#venues" className="contact-section__cta">
            Browse All Spaces
          </a>
        </div>
        <div className="contact-section__text">
          <p className="contact-section__eyebrow">Get in touch</p>
          <h2 id="contact-title" className="contact-section__title">
            LET'S MAKE YOUR EVENT UNFORGETTABLE.
          </h2>
          <p className="contact-section__body">
            Ready to book a space for your next event? Our team is here to help you find
            the perfect venue and create an experience your guests will remember.
          </p>
          <p className="contact-section__body">
            Use the AI assistant to check availability instantly, or send us a direct
            message and we'll get back to you within one business day.
          </p>
        </div> 
      </div>
    </section>
  )
}
