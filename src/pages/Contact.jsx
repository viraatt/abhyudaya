import { club, socials } from '../data/club.js'
import PageHero from '../components/PageHero.jsx'
import './Contact.css'

export default function Contact() {
  return (
    <>
      <PageHero
        eyebrow="Get in touch"
        title="Come build with us."
        lede="Become part of MPEC's most active  community. Learn, build, lead and grow with Abhyudaya Club."
      />

      <section className="section">
        <div className="wrap contact-grid">

          {/* LEFT SIDE */}
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
              <p className="eyebrow">Follow Along</p>

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

          {/* RIGHT SIDE */}

          <div className="join-card">

            <span className="join-badge">
              🚀 Join Abhyudaya Club
            </span>

            <h2>Become a Member</h2>

            <p>
              Join the official Science & Literary Club of Maharana Pratap
              Engineering College and become part of an innovative community.
            </p>

            <div className="join-features">

              <div>💻 Technical Team</div>

              <div>🎨 PR & Creative</div>

              <div>📷 Photography</div>

              <div>🎬 Video Editing</div>

              <div>🎯 Operations</div>

              <div>🚀 Workshops & Hackathons</div>

            </div>

            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSdGOahFn3oFuG1H7vOre7YT6aNJAuGod38brtzVFNRZfmXUew/viewform"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--solid register-btn"
            >
              Register Now →
            </a>

          </div>

        </div>
      </section>

      <section className="section">

        <div className="wrap">

          <div className="faq-card">

            <h2>Frequently Asked Questions</h2>

            <div className="faq-item">
              <h3>Who can join?</h3>
              <p>Any student of Maharana Pratap Engineering College can join.</p>
            </div>

            <div className="faq-item">
              <h3>Do I need coding experience?</h3>
              <p>No. Beginners are always welcome.</p>
            </div>

            <div className="faq-item">
              <h3>What teams are available?</h3>
              <p>
                Technical, PR & Creative, Photography, Video Editing,
                Operations and Event Management.
              </p>
            </div>

            <div className="faq-item">
              <h3>How will I receive updates?</h3>
              <p>Through our WhatsApp community and Instagram page.</p>
            </div>

          </div>

        </div>

      </section>

    </>
  )
}
