import { NavLink } from 'react-router-dom'
import { navLinks, socials, club } from '../data/club.js'
import logo from '../assets/logo-120.png'
import './Footer.css'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="wrap footer__inner">
        <div className="footer__top">
          <div className="footer__brand">
            <img src={logo} alt="Abhyudaya Club logo" className="footer__mark" />
            <div>
              <p className="footer__name">{club.fullName}</p>
              <p className="footer__tag">{club.institute}</p>
            </div>
          </div>

          <nav className="footer__links" aria-label="Footer navigation">
            {navLinks.map((link) => (
              <NavLink key={link.to} to={link.to} className="footer__link">
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="footer__connect">
            <p className="eyebrow footer__connect-label">Social presence</p>
            <a
              href={socials.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="footer__pill"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                <rect x="2.5" y="2.5" width="19" height="19" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="12" cy="12" r="4.3" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
              </svg>
              Instagram
            </a>
            <a
              href={socials.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="footer__pill"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                <rect x="2.5" y="2.5" width="19" height="19" rx="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="7.4" cy="8" r="1.15" fill="currentColor" />
                <rect x="6.4" y="10.6" width="2" height="7" fill="currentColor" />
                <path
                  d="M10.8 17.6v-7h2v1c.5-.75 1.3-1.2 2.3-1.2 1.9 0 2.9 1.25 2.9 3.4v3.8h-2v-3.5c0-1-.4-1.7-1.4-1.7-.8 0-1.3.55-1.5 1.05-.08.2-.1.45-.1.7v3.45z"
                  fill="currentColor"
                />
              </svg>
              LinkedIn
            </a>
            <a href={`mailto:${socials.email}`} className="footer__pill footer__pill--email">
              {socials.email}
            </a>
          </div>
        </div>

        <div className="footer__horizon" aria-hidden="true" />

        <div className="footer__bottom">
          <p className="footer__meaning">{club.meaning}</p>
          <p className="footer__copyright">
            &copy; {year} {club.fullName}, {club.institute}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
