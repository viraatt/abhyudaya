import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { club, events } from '../data/club.js'
import logo from '../assets/logo-512.png'
import './Home.css'

const featured = events.find((e) => e.featured)
const otherEvents = events.filter((e) => !e.featured).slice(0, 4)

export default function Home() {
  const videoRef = useRef(null)
  const [videoReady, setVideoReady] = useState(false)

  useEffect(() => {
    // Respect reduced-motion preference: never autoplay the video for
    // people who've asked their OS not to show motion.
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion || !videoRef.current) return
    videoRef.current.play?.().catch(() => {
      // Autoplay can be blocked by the browser — that's fine, the static
      // gradient background underneath still looks intentional.
    })
  }, [])

  return (
    <>
      <Helmet>
        <title>Abhyudaya Club | Science & Literary Club of MPEC Kanpur</title>
        <meta name="description" content="Abhyudaya Club is the official Science & Literary Club of Maharana Pratap Engineering College (MPEC) Kanpur. Explore our events, workshops, and student initiatives." />
        <link rel="canonical" href="https://abhyudayaclub.in/" />
        <meta property="og:title" content="Abhyudaya Club | Science & Literary Club of MPEC Kanpur" />
        <meta property="og:description" content="Abhyudaya Club — fostering curiosity, creativity, innovation and leadership at MPEC Kanpur." />
        <meta property="og:url" content="https://abhyudayaclub.in/" />
        <meta property="og:image" content="https://abhyudayaclub.in/favicon.png" />
        <meta name="twitter:title" content="Abhyudaya Club | Science & Literary Club of MPEC Kanpur" />
        <meta name="twitter:description" content="Abhyudaya Club — fostering curiosity, creativity, innovation and leadership at MPEC Kanpur." />
        <meta name="twitter:image" content="https://abhyudayaclub.in/favicon.png" />
      </Helmet>
      <section className="hero">
        {/* Background video. Drop your file at public/videos/hero-bg.mp4
            (and optionally a .webm copy) — see README for details.
            Until a file exists there, this silently falls back to the
            navy gradient below with zero layout shift or console noise. */}
        <div className="hero__media" aria-hidden="true">
          <video
            ref={videoRef}
            className={`hero__video ${videoReady ? 'hero__video--ready' : ''}`}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onCanPlay={() => setVideoReady(true)}
            onError={() => setVideoReady(false)}
          >
            <source src="/videos/hero-bg.webm" type="video/webm" />
            <source src="/videos/hero-bg.mp4" type="video/mp4" />
          </video>
          <div className="hero__media-overlay" />
        </div>

        <div className="wrap hero__inner">
          <img src={logo} alt="" className="hero__logo" />
          <p className="eyebrow hero__eyebrow">{club.institute}</p>
          <h1 className="hero__title">
            Abhyudaya <span>rises</span> here.
          </h1>
          <p className="hero__lede">
            The science &amp; literary club of MPEC Kanpur, run under the{' '}
            {club.department}. We build fests, workshops, and competitions for
            students who'd rather make something than just study it.
          </p>
          <div className="hero__actions">
            <Link to="/events" className="btn btn--solid">
              Explore events
            </Link>
            <Link to="/contact" className="btn btn--ghost">
              Join the club
            </Link>
          </div>
        </div>

        <div className="hero__horizon" aria-hidden="true" />
      </section>

      <section className="strip">
        <div className="wrap strip__inner">
          <div className="strip__item">
            <span className="strip__num">01</span>
            <p>Flagship annual events — TechBloom ,CommuniCraft &amp; Annual Student Orientation Programme</p>
          </div>
          <div className="strip__item">
            <span className="strip__num">02</span>
            <p>{events.length} events run across quizzes, design, and workshops</p>
          </div>
          <div className="strip__item">
            <span className="strip__num">03</span>
            <p>Open to every branch and every year</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section__head">
            <p className="eyebrow">What we are</p>
            <h2>Where an idea gets off the ground.</h2>
          </div>
          <div className="about-grid">
            <p className="about-grid__lede">
              {club.meaning} We exist so that a student's first workshop, first
              pitch, or first line of code has somewhere to happen — and
              someone in the room who's building it alongside them.
            </p>
            <Link to="/about" className="link-arrow">
              Read our story <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </section>

      {featured && (
        <section className="section section--dark">
          <div className="wrap">
            <div className="featured">
              <div className="featured__text">
                <p className="eyebrow">{featured.kind}</p>
                <h2>{featured.name}</h2>
                <p className="featured__summary">{featured.detail}</p>
                <Link to="/events" className="link-arrow link-arrow--light">
                  See all events <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
              <ul className="featured__list">
                {otherEvents.map((ev) => (
                  <li key={ev.slug}>
                    <span className="featured__list-kind">{ev.kind}</span>
                    <span className="featured__list-name">{ev.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      <section className="section cta">
        <div className="wrap cta__inner">
          <h2>
            Got an idea worth <span>building</span>?
          </h2>
          <p>Come to a meeting, pitch it, and we'll help you find the runway.</p>
          <Link to="/contact" className="btn btn--solid">
            Get in touch
          </Link>
        </div>
      </section>
    </>
  )
}
