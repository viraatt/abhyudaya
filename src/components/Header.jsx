import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { navLinks } from '../data/club.js'
import logo from '../assets/logo-120.png'
import './Header.css'

export default function Header() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [eventsOpen, setEventsOpen] = useState(false)
  const location = useLocation()
  const eventsRef = useRef(null)

  useEffect(() => {
    const handleScroll = () => {
      const currentScroll =
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0
      const isScrolled = currentScroll > 50
      setScrolled((prev) => (prev !== isScrolled ? isScrolled : prev))
    }

    // Initialize check on mount / route transition
    handleScroll()

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [location.pathname])

  // Lock background body scroll when mobile menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  // Close dropdown on route change
  useEffect(() => {
    setEventsOpen(false)
  }, [location.pathname])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (eventsRef.current && !eventsRef.current.contains(e.target)) {
        setEventsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close dropdown on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setEventsOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const closeMenu = () => setOpen(false)

  const closeDropdown = () => {
    setEventsOpen(false)
    setOpen(false)
  }

  const isEventsActive =
    location.pathname === '/events' || location.pathname.startsWith('/register')

  return (
    <header className={`navbar ${scrolled ? 'navbar--scrolled scrolled' : ''}`}>
      {/* Backdrop overlay for mobile drawer */}
      <div
        className={`navbar__overlay ${open ? 'navbar__overlay--visible' : ''}`}
        onClick={closeMenu}
        aria-hidden="true"
      />

      <div className="navbar__container">

        {/* Left: Branding */}
        <NavLink to="/" className="navbar__brand" onClick={closeMenu} aria-label="Abhyudaya Club – Home">
          <img
            src={logo}
            alt="Abhyudaya Club logo"
            className="navbar__logo"
          />
          <span className="navbar__brand-text">
            <span className="navbar__brand-title">Abhyudaya</span>
            <span className="navbar__brand-sub">
              CLUB &middot; MPEC KANPUR
            </span>
          </span>
        </NavLink>

        {/* Center: Navigation Links */}
        <nav
          id="primary-nav"
          className={`navbar__links ${open ? 'navbar__links--open' : ''}`}
          aria-label="Primary navigation"
        >

          {navLinks.map((link) => {
            // Events renders as a dropdown with sub-links
            if (link.label === 'Events') {
              return (
                <div
                  className="navbar__dropdown"
                  key={link.to}
                  ref={eventsRef}
                >
                  <button
                    type="button"
                    className={`navbar__link navbar__dropdown-toggle ${
                      eventsOpen ? 'navbar__dropdown-toggle--open' : ''
                    } ${isEventsActive ? 'navbar__link--active' : ''}`}
                    aria-haspopup="true"
                    aria-expanded={eventsOpen}
                    onClick={() => setEventsOpen((v) => !v)}
                  >
                    Events
                    <svg
                      className="navbar__dropdown-chevron"
                      viewBox="0 0 24 24"
                      width="12"
                      height="12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  <div
                    className={`navbar__dropdown-menu ${
                      eventsOpen ? 'navbar__dropdown-menu--open' : ''
                    }`}
                  >
                    <NavLink
                      to="/events"
                      className={({ isActive }) =>
                        `navbar__dropdown-item ${
                          isActive ? 'navbar__dropdown-item--active' : ''
                        }`
                      }
                      onClick={closeDropdown}
                    >
                      Existing Events
                    </NavLink>
                    <NavLink
                      to="/register"
                      className={({ isActive }) =>
                        `navbar__dropdown-item ${
                          isActive ? 'navbar__dropdown-item--active' : ''
                        }`
                      }
                      onClick={closeDropdown}
                    >
                      Register for Event
                    </NavLink>
                  </div>
                </div>
              )
            }

            return (
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
            )
          })}

          {/* Mobile-only actions (inside the slide-down panel) */}
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

        {/* Mobile Hamburger Toggle */}
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