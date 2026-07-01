import { useState } from 'react'
import { club, socials } from '../data/club.js'
import PageHero from '../components/PageHero.jsx'
import './Contact.css'

export default function Contact() {
  const [sent, setSent] = useState(false)

  // No backend is wired up yet. This just gives the form a working,
  // accessible interaction — connect it to a real endpoint or form
  // service (Formspree, Google Forms, a mail API, etc.) when ready.
  function handleSubmit(e) {
    e.preventDefault()
    setSent(true)
  }

  return (
    <>
      <PageHero
        eyebrow="Get in touch"
        title="Come build with us."
        lede="Whether you want to join the core team, run an event, or just find out when the next fest is — this is the place to start."
      />

      <section className="section">
        <div className="wrap contact-grid">
          <div className="contact-info">
            <div className="contact-info__block">
              <p className="eyebrow">Find us</p>
              <p className="contact-info__text">{club.institute}</p>
              <p className="contact-info__text">{club.department}</p>
            </div>

            <div className="contact-info__block">
              <p className="eyebrow">Email</p>
              <a href={`mailto:${socials.email}`} className="contact-info__text contact-info__email">
                {socials.email}
              </a>
            </div>

            <div className="contact-info__block">
              <p className="eyebrow">Follow along</p>
              <div className="contact-info__socials">
                <a href={socials.instagram} target="_blank" rel="noopener noreferrer" className="social-pill">
                  Instagram
                </a>
                <a href={socials.linkedin} target="_blank" rel="noopener noreferrer" className="social-pill">
                  LinkedIn
                </a>
              </div>
            </div>
          </div>

          <form className="contact-form" onSubmit={handleSubmit}>
            {sent ? (
              <div className="contact-form__success" role="status">
                <h3>Message ready to send</h3>
                <p>Thanks for reaching out — connect this form to an email or form service to start receiving these for real.</p>
              </div>
            ) : (
              <>
                <div className="field">
                  <label htmlFor="name">Name</label>
                  <input id="name" name="name" type="text" required placeholder="Your full name" />
                </div>
                <div className="field">
                  <label htmlFor="email">Email</label>
                  <input id="email" name="email" type="email" required placeholder="you@example.com" />
                </div>
                <div className="field">
                  <label htmlFor="branch">Branch &amp; year</label>
                  <input id="branch" name="branch" type="text" placeholder="e.g. B.Tech CSE, 2nd year" />
                </div>
                <div className="field">
                  <label htmlFor="message">Message</label>
                  <textarea id="message" name="message" rows="4" required placeholder="What would you like to do with the club?" />
                </div>
                <button type="submit" className="btn btn--solid">
                  Send message
                </button>
              </>
            )}
          </form>
        </div>
      </section>
    </>
  )
}
