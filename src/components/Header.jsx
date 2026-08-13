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

  // Lock body scroll when mobile menu is open, handle ESC key & window resize
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }

    const handleResize = () => {
      if (window.innerWidth >= 1024) setOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', handleResize)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', handleResize)
    }
  }, [open])

  const closeMenu = () => setOpen(false)

  return (
    <header className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
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

          {/* Mobile-only actions (inside mobile drawer) */}
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