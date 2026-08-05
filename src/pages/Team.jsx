import { useEffect, useState } from 'react'
import { team as staticTeam } from '../data/club.js'
import { Helmet } from 'react-helmet-async'
import PageHero from '../components/PageHero.jsx'
import { getTeamMembers } from '../Admin/pages/services/teamService.js'
import './Team.css'

/* ----------------------------------------------------------------
   TeamCard — individual person card
   Replaced inline style props with proper CSS class names
   ---------------------------------------------------------------- */
function TeamCard({ person }) {
  const avatarFallback =
    "https://ui-avatars.com/api/?name=" +
    encodeURIComponent(person.name) +
    "&background=0D8ABC&color=fff&size=500";

  return (
    <div className="team-card">
      {/* Image fills top section via aspect-ratio: 1/1 in CSS */}
      <img
        src={person.image || avatarFallback}
        alt={person.name}
        className="team-card__image"
        onError={(e) => {
          e.target.src = avatarFallback;
        }}
      />

      <div className="team-card__content">
        <h3 className="team-card__name">{person.name}</h3>

        <p className="team-card__role">{person.role}</p>

        {/* Bio — moved from inline style to CSS class */}
        {person.bio && (
          <p className="team-card__bio">
            {person.bio}
          </p>
        )}

        {/* Social links row — moved from inline style to CSS class */}
        <div className="team-card__links">
          {person.linkedin && (
            <a
              href={person.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="team-card__linkedin"
            >
              LinkedIn
            </a>
          )}
          {person.github && (
            <a
              href={person.github}
              target="_blank"
              rel="noopener noreferrer"
              className="team-card__linkedin"
            >
              GitHub
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------
   Team — page component
   Faculty section uses two-column layout:
     Left:  Heading + description (section__head)
     Right: Faculty card
   ---------------------------------------------------------------- */
export default function Team() {
  const [dbMembers, setDbMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getTeamMembers()
        setDbMembers(data)
      } catch (err) {
        console.error("Error loading team members from Firestore:", err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // If DB has members, use them, grouped by category; else fallback to static data
  const hasDbData = dbMembers.length > 0;

  const facultyMembers = hasDbData
    ? dbMembers.filter((m) => m.category === "Faculty Co-ordinators")
    : staticTeam.faculty;

  const studentMembers = hasDbData
    ? dbMembers.filter((m) => m.category !== "Faculty Co-ordinators")
    : staticTeam.core;

  return (
    <>
      <Helmet>
        <title>Our Team | Abhyudaya Club — Faculty & Student Leaders at MPEC Kanpur</title>
        <meta name="description" content="Meet the Abhyudaya Club team — dedicated faculty advisors and passionate student leaders who organize events, promote innovation, and drive student growth at MPEC Kanpur." />
        <link rel="canonical" href="https://abhyudayaclub.in/team" />
        <meta property="og:title" content="Our Team | Abhyudaya Club" />
        <meta property="og:description" content="Meet the faculty advisors and student leaders of Abhyudaya Club at MPEC Kanpur." />
        <meta property="og:url" content="https://abhyudayaclub.in/team" />
        <meta property="og:image" content="https://abhyudayaclub.in/favicon.png" />
        <meta name="twitter:title" content="Our Team | Abhyudaya Club" />
        <meta name="twitter:description" content="Meet the faculty advisors and student leaders of Abhyudaya Club at MPEC Kanpur." />
        <meta name="twitter:image" content="https://abhyudayaclub.in/favicon.png" />
      </Helmet>

      <PageHero
        eyebrow="Meet Our Team"
        title="The People Behind Abhyudaya"
        lede="Our dedicated faculty advisor and student leadership work together to organize events, promote innovation, and create opportunities for every student."
      />

      {/* ---- FACULTY ADVISOR SECTION ---- */}
      <section className="section">
        <div className="wrap">
          {/*
            Two-column layout:
            Left column  → heading + description
            Right column → faculty card(s)
            Collapses to single column on tablet/mobile via CSS
          */}
          <div className="faculty-layout">

            {/* LEFT: heading + description */}
            <div className="faculty-text">
              <div className="section__head">
                <p className="eyebrow">Faculty Advisor</p>
                <h2>Department of Basic Sciences &amp; Humanities</h2>
              </div>
            </div>

            {/* RIGHT: faculty card(s) */}
            <div className="team-grid team-grid--faculty">
              {facultyMembers.map((person) => (
                <TeamCard key={person.id || person.name} person={person} />
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ---- STUDENT LEADERSHIP SECTION ---- */}
      <section className="section section--dark">
        <div className="wrap">
          <div className="section__head">
            <p className="eyebrow">Student Leadership</p>
            <h2>Executive Board &amp; Team Leads</h2>
          </div>

          <div className="team-grid">
            {studentMembers.map((person) => (
              <TeamCard key={person.id || person.name} person={person} />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
