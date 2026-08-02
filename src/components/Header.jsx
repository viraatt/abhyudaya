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
    window.addEventListener('scroll', onScroll)

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const closeMenu = () => setOpen(false)

  return (
    <header className={`header ${scrolled ? 'header--scrolled' : ''}`}>
      <div className="wrap header__inner">
        <NavLink to="/" className="brand" onClick={closeMenu}>
          <img
            src={logo}
            alt="Abhyudaya Club logo"
            className="brand__mark"
          />

          <span className="brand__text">
            Abhyudaya
            <span className="brand__sub">
              Club &middot; MPGI Kanpur
            </span>
          </span>
        </NavLink>

        <button
          className={`menu-btn ${open ? 'menu-btn--open' : ''}`}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="primary-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav
          id="primary-nav"
          className={`nav ${open ? 'nav--open' : ''}`}
        >
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `nav__link ${isActive ? 'nav__link--active' : ''}`
              }
              onClick={closeMenu}
            >
              {link.label}
            </NavLink>
          ))}

          {/* Join Club Button */}
          <NavLink
            to="/join"
            className="nav__cta"
            onClick={closeMenu}
          >
            Join the Club
          </NavLink>

          {/* Admin Login Button */}
          <NavLink
            to="/admin/login"
            className="nav__cta nav__admin"
            onClick={closeMenu}
          >
            Admin Login
          </NavLink>
        </nav>
      </div>
    </header>
  )
}