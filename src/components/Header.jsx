import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { navLinks } from '../data/club.js'
import logo from '../assets/logo-120.png'
import './Header.css'

export default function Header() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Lock body scroll while the mobile panel is open
  useEffect(() => {
    if (open) {
      const prevOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prevOverflow
      }
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const closeMenu = () => setOpen(false)

  return (
    <header className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      <div className="navbar__container">

        {/* Left: Branding */}
        <NavLink to="/" className="navbar__brand" onClick={closeMenu} aria-label="Abhyudaya Club – Home">
          <img
            src={logo}
            alt="Abhyudaya Club logo"
            className="navbar__logo"
          />
          <span className="navbar__brand-text">
            Abhyudaya
            <span className="navbar__brand-sub">
              Club &middot; MPGI Kanpur
            </span>
          </span>
        </NavLink>

        {/* Center: Navigation Links */}
        <nav
          id="primary-nav"
          className={`navbar__links ${open ? 'navbar__links--open' : ''}`}
          aria-label="Primary navigation"
        >
          {/* Close button lives inside the panel, top-right */}
          <button
            type="button"
            className="navbar__panel-close"
            aria-label="Close menu"
            onClick={closeMenu}
          >
            <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
              <line x1="5" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="19" y1="5" x2="5" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `navbar__link ${isActive ? 'navbar__link--active' : ''}`
              }
              onClick={closeMenu}
            >
              {link.label}
            </NavLink>
          ))}

          {/* Mobile-only actions (inside the slide-in panel) */}
          <div className="navbar__mobile-actions">
            <NavLink
              to="/join"
              className="navbar__cta navbar__cta--primary"
              onClick={closeMenu}
            >
              Join the Club
            </NavLink>
            <NavLink
              to="/admin/login"
              className="navbar__cta navbar__cta--secondary"
              onClick={closeMenu}
            >
              Admin Login
            </NavLink>
          </div>
        </nav>

        {/* Backdrop shown behind the panel on mobile */}
        {open && (
          <div
            className="navbar__backdrop"
            onClick={closeMenu}
            aria-hidden="true"
          />
        )}

        {/* Right: Desktop Actions */}
        <div className="navbar__actions">
          <NavLink
            to="/join"
            className="navbar__cta navbar__cta--primary"
            onClick={closeMenu}
          >
            Join the Club
          </NavLink>
          <NavLink
            to="/admin/login"
            className="navbar__cta navbar__cta--secondary"
            onClick={closeMenu}
          >
            Admin Login
          </NavLink>
        </div>

        {/* Mobile Hamburger */}
        <button
          className={`navbar__toggle ${open ? 'navbar__toggle--open' : ''}`}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="primary-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>

      </div>
    </header>
  )
}