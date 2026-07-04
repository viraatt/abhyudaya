import { club, socials } from '../data/club.js'
import PageHero from '../components/PageHero.jsx'
import './Contact.css'

export default function Contact() {
  return (
    <>
      <PageHero
        eyebrow="Get in Touch"
        title="Let's Connect."
        lede="Have a question, collaboration idea, or want to know more about Abhyudaya Club? We'd love to hear from you."
      />

      <section className="section">
        <div className="wrap contact-grid">

          {/* Contact Information */}

          <div className="contact-info">

            <div className="contact-info__block">
              <p className="eyebrow">📍 Address</p>

              <p className="contact-info__text">{club.institute}</p>

              <p className="contact-info__text">{club.department}</p>
            </div>

            <div className="contact-info__block">

              <p className="eyebrow">📧 Email</p>

              <a
                href={`mailto:${socials.email}`}
                className="contact-info__text contact-info__email"
              >
                {socials.email}
              </a>

            </div>

            <div className="contact-info__block">

              <p className="eyebrow">🌐 Follow Us</p>

              <div className="contact-info__socials">

                <a
                  href={socials.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-pill"
                >
                  Instagram
                </a>

                <a
                  href={socials.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-pill"
                >
                  LinkedIn
                </a>

              </div>

            </div>

          </div>

          {/* Collaboration Card */}

          <div className="join-card">

            <span className="join-badge">
              🤝 Collaborate With Us
            </span>

            <h2>Partner With Abhyudaya</h2>

            <p>
              We welcome collaborations from students, faculty,
              startups, organizations, alumni and industry experts
              for workshops, events and innovation initiatives.
            </p>

            <a
              href={`mailto:${socials.email}`}
              className="btn btn--solid register-btn"
            >
              Email Us →
            </a>

          </div>

        </div>

      </section>

      <section className="section">

        <div className="wrap">

          <div className="faq-card">

            <h2>Frequently Asked Questions</h2>

            <div className="faq-item">
              <h3>How can I contact the club?</h3>
              <p>Email us anytime or reach out through our Instagram or LinkedIn pages.</p>
            </div>

            <div className="faq-item">
              <h3>Can I collaborate with Abhyudaya Club?</h3>
              <p>Yes. We welcome collaborations, sponsorships, guest lectures and workshops.</p>
            </div>

            <div className="faq-item">
              <h3>Where are your events conducted?</h3>
              <p>Most events are organized at Maharana Pratap Engineering College, Kanpur.</p>
            </div>

            <div className="faq-item">
              <h3>How quickly do you reply?</h3>
              <p>We usually respond within 24–48 hours.</p>
            </div>

          </div>

        </div>

      </section>

    </>
  )
}
