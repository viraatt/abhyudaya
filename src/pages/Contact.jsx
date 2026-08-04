import { useEffect, useRef } from 'react'
import { Helmet } from 'react-helmet-async'
import { club, socials } from '../data/club.js'
import PageHero from '../components/PageHero.jsx'
import './Contact.css'

// Fades/slides in any ".reveal" child inside the returned ref, once it scrolls into view.
function useReveal() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const items = el.querySelectorAll('.reveal')
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            io.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15 }
    )
    items.forEach((item) => io.observe(item))
    return () => io.disconnect()
  }, [])
  return ref
}

export default function Contact() {
  const gridRef = useReveal()
  const faqRef = useReveal()

  const mapQuery = encodeURIComponent(`${club.institute}, ${club.department}`)

  return (
    <>
      <Helmet>
        <title>Contact Us | Abhyudaya Club — Get in Touch, MPEC Kanpur</title>
        <meta name="description" content="Contact Abhyudaya Club at MPEC Kanpur. Reach out for collaborations, sponsorships, queries, or to learn more about joining the club." />
        <link rel="canonical" href="https://abhyudayaclub.in/contact" />
        <meta property="og:title" content="Contact Abhyudaya Club | MPEC Kanpur" />
        <meta property="og:description" content="Get in touch with Abhyudaya Club for collaborations, sponsorships, or queries." />
        <meta property="og:url" content="https://abhyudayaclub.in/contact" />
        <meta property="og:image" content="https://abhyudayaclub.in/favicon.png" />
        <meta name="twitter:title" content="Contact Abhyudaya Club | MPEC Kanpur" />
        <meta name="twitter:description" content="Get in touch with Abhyudaya Club for collaborations, sponsorships, or queries." />
        <meta name="twitter:image" content="https://abhyudayaclub.in/favicon.png" />
      </Helmet>
      <PageHero
        eyebrow="Get in Touch"
        title="Let's Connect."
        lede="Have a question, collaboration idea, or want to know more about Abhyudaya Club? We'd love to hear from you."
      />
      <section className="section">
        <div className="wrap contact-grid" ref={gridRef}>
          {/* Contact Information */}
          <div className="contact-info">
            <div className="contact-info__block reveal">
              <p className="eyebrow">📍 Address</p>
              <p className="contact-info__text">{club.institute}</p>
              <p className="contact-info__text">{club.department}</p>
            </div>

            {/* Map */}
            <div className="contact-info__block contact-map reveal">
              <iframe
                title="Club location map"
                className="contact-map__frame"
                src={`https://maps.google.com/maps?q=${mapQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            <div className="contact-info__block reveal">
              <p className="eyebrow">📧 Email</p>
              <a
                href={`mailto:${socials.email}`}
                className="contact-info__text contact-info__email"
              >
                {socials.email}
              </a>
            </div>

            <div className="contact-info__block reveal">
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
                {socials.twitter && (
                  <a
                    href={socials.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-pill"
                  >
                    Twitter / X
                  </a>
                )}
                {socials.whatsapp && (
                  <a
                    href={socials.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-pill"
                  >
                    WhatsApp
                  </a>
                )}
                {socials.youtube && (
                  <a
                    href={socials.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-pill"
                  >
                    YouTube
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Collaboration Card */}
          <div className="join-card reveal">
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
          <div className="faq-card" ref={faqRef}>
            <h2>Frequently Asked Questions</h2>
            <div className="faq-item reveal">
              <h3>How can I contact the club?</h3>
              <p>Email us anytime or reach out through our Instagram or LinkedIn pages.</p>
            </div>
            <div className="faq-item reveal">
              <h3>Can I collaborate with Abhyudaya Club?</h3>
              <p>Yes. We welcome collaborations, sponsorships, guest lectures and workshops.</p>
            </div>
            <div className="faq-item reveal">
              <h3>Where are your events conducted?</h3>
              <p>Most events are organized at Maharana Pratap Engineering College, Kanpur.</p>
            </div>
            <div className="faq-item reveal">
              <h3>How quickly do you reply?</h3>
              <p>We usually respond within 24–48 hours.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
