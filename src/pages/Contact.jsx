import { useEffect, useRef, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { club, socials } from '../data/club.js'
import PageHero from '../components/PageHero.jsx'
import BreadcrumbSchema from '../components/seo/schemas/BreadcrumbSchema.jsx'
import './Contact.css'
import { submitContactMessage } from '../Admin/pages/services/contactService.js'

const SITE_URL = "https://www.abhyudayaclub.in";

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

  const [formState, setFormState] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submittedStatus, setSubmittedStatus] = useState(null)

  const breadcrumbItems = [
    { name: "Home", url: SITE_URL },
    { name: "Contact", url: `${SITE_URL}/contact` },
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How can I contact the club?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Email us anytime at abhyudayaclubmpec@gmail.com or reach out through our Instagram or LinkedIn pages.",
        },
      },
      {
        "@type": "Question",
        name: "Can I collaborate with Abhyudaya Club?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. We welcome collaborations, sponsorships, guest lectures and workshops.",
        },
      },
      {
        "@type": "Question",
        name: "Where are your events conducted?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Most events are organized at Maharana Pratap Engineering College, Kanpur.",
        },
      },
      {
        "@type": "Question",
        name: "How quickly do you reply?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "We usually respond within 24–48 hours.",
        },
      },
    ],
  };

  const handleInputChange = (e) => {
    setFormState({ ...formState, [e.target.name]: e.target.value })
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    if (!formState.name || !formState.email || !formState.message) return
    setSubmitting(true)
    setSubmittedStatus(null)

    try {
      await submitContactMessage(formState)
      setSubmittedStatus({
        success: true,
        message: 'Thank you! Your message has been sent successfully. We will get back to you soon.',
      })
      setFormState({ name: '', email: '', phone: '', subject: '', message: '' })
    } catch (err) {
      console.error(err)
      setSubmittedStatus({
        success: false,
        message: 'Unable to send message at the moment. Please try emailing us directly.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const mapQuery = encodeURIComponent(`${club.institute}, ${club.department}`)

  return (
    <>
      <Helmet>
        <title>Contact Us | Abhyudaya Club — Get in Touch, MPEC Kanpur</title>
        <meta name="description" content="Contact Abhyudaya Club at MPEC Kanpur. Reach out for collaborations, sponsorships, queries, or to learn more about joining the club." />
        <link rel="canonical" href={`${SITE_URL}/contact`} />
        <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1" />

        <meta property="og:type" content="website" />
        <meta property="og:title" content="Contact Abhyudaya Club | MPEC Kanpur" />
        <meta property="og:description" content="Get in touch with Abhyudaya Club for collaborations, sponsorships, or queries." />
        <meta property="og:url" content={`${SITE_URL}/contact`} />
        <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
        <meta property="og:locale" content="en_IN" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Contact Abhyudaya Club | MPEC Kanpur" />
        <meta name="twitter:description" content="Get in touch with Abhyudaya Club for collaborations, sponsorships, or queries." />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.png`} />

        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
      </Helmet>

      <BreadcrumbSchema items={breadcrumbItems} />

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

          {/* Contact Inquiry Form */}
          <div className="join-card reveal">
            <span className="join-badge">
              📩 Send Us a Message
            </span>
            <h2>Get in Touch Directly</h2>
            <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
              <input
                type="text"
                name="name"
                value={formState.name}
                onChange={handleInputChange}
                placeholder="Your Full Name *"
                required
                aria-label="Your Full Name"
                style={{ padding: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#fff" }}
              />

              <input
                type="email"
                name="email"
                value={formState.email}
                onChange={handleInputChange}
                placeholder="Your Email Address *"
                required
                aria-label="Your Email Address"
                style={{ padding: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#fff" }}
              />

              <input
                type="tel"
                name="phone"
                value={formState.phone}
                onChange={handleInputChange}
                placeholder="Phone Number (Optional)"
                aria-label="Phone Number"
                style={{ padding: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#fff" }}
              />

              <input
                type="text"
                name="subject"
                value={formState.subject}
                onChange={handleInputChange}
                placeholder="Subject / Topic"
                aria-label="Subject or Topic"
                style={{ padding: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#fff" }}
              />

              <textarea
                rows="4"
                name="message"
                value={formState.message}
                onChange={handleInputChange}
                placeholder="Write your message here... *"
                required
                aria-label="Your message"
                style={{ padding: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#fff", resize: "vertical" }}
              />

              <button
                type="submit"
                className="btn btn--solid register-btn"
                disabled={submitting}
                style={{ border: "none", cursor: "pointer", opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? "Sending..." : "Submit Message →"}
              </button>

              {submittedStatus && (
                <p style={{ marginTop: "8px", color: submittedStatus.success ? "#4ade80" : "#f87171", fontSize: "14px" }}>
                  {submittedStatus.message}
                </p>
              )}
            </form>
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
