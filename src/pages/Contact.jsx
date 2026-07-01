import { club, socials } from '../data/club.js'
import PageHero from '../components/PageHero.jsx'
import './Contact.css'

export default function Contact() {
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
              <a
                href={`mailto:${socials.email}`}
                className="contact-info__text contact-info__email"
              >
                {socials.email}
              </a>
            </div>

            <div className="contact-info__block">
              <p className="eyebrow">Follow along</p>

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

          <div className="contact-form">
            <iframe
              src="https://docs.google.com/forms/d/e/1FAIpQLSdGOahFn3oFuG1H7vOre7YT6aNJAuGod38brtzVFNRZfmXUew/viewform?embedded=true"
              width="100%"
              height="900"
              frameBorder="0"
              marginHeight="0"
              marginWidth="0"
              title="Abhyudaya Club Registration Form"
            >
              Loading...
            </iframe>
          </div>

        </div>
      </section>
    </>
  )
}
