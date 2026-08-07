import { useEffect, useState, memo } from 'react'
import { team as staticTeam } from '../data/club.js'
import { Helmet } from 'react-helmet-async'
import PageHero from '../components/PageHero.jsx'
import BreadcrumbSchema from '../components/seo/schemas/BreadcrumbSchema.jsx'
import { getTeamMembers } from '../Admin/pages/services/teamService.js'
import './Team.css'

const SITE_URL = "https://www.abhyudayaclub.in";

/* ----------------------------------------------------------------
   TeamCard — individual person card
   ---------------------------------------------------------------- */
const TeamCard = memo(function TeamCard({ person }) {
  const avatarFallback =
    "https://ui-avatars.com/api/?name=" +
    encodeURIComponent(person.name) +
    "&background=0D8ABC&color=fff&size=500";

  return (
    <div className="team-card">
      <img
        src={person.image || avatarFallback}
        alt={`${person.name} — ${person.role} at Abhyudaya Club`}
        className="team-card__image"
        loading="lazy"
        decoding="async"
        width="300"
        height="300"
        onError={(e) => {
          e.target.src = avatarFallback;
        }}
      />

      <div className="team-card__content">
        <h3 className="team-card__name">{person.name}</h3>

        <p className="team-card__role">{person.role}</p>

        {person.bio && (
          <p className="team-card__bio">
            {person.bio}
          </p>
        )}

        <div className="team-card__links">
          {person.linkedin && (
            <a
              href={person.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="team-card__linkedin"
              aria-label={`${person.name} LinkedIn`}
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
              aria-label={`${person.name} GitHub`}
            >
              GitHub
            </a>
          )}
        </div>
      </div>
    </div>
  )
});

export default function Team() {
  const [dbMembers, setDbMembers] = useState([])
  const [loading, setLoading] = useState(true)

  const breadcrumbItems = [
    { name: "Home", url: SITE_URL },
    { name: "Team", url: `${SITE_URL}/team` },
  ];

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
        <link rel="canonical" href={`${SITE_URL}/team`} />
        <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1" />

        <meta property="og:title" content="Our Team | Abhyudaya Club — MPEC Kanpur" />
        <meta property="og:description" content="Meet the faculty advisors and student leaders of Abhyudaya Club at MPEC Kanpur." />
        <meta property="og:url" content={`${SITE_URL}/team`} />
        <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
        <meta property="og:locale" content="en_IN" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Our Team | Abhyudaya Club" />
        <meta name="twitter:description" content="Meet the faculty advisors and student leaders of Abhyudaya Club at MPEC Kanpur." />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.png`} />
      </Helmet>

      <BreadcrumbSchema items={breadcrumbItems} />

      <PageHero
        eyebrow="Meet Our Team"
        title="The People Behind Abhyudaya"
        lede="Our dedicated faculty advisor and student leadership work together to organize events, promote innovation, and create opportunities for every student."
      />

      {/* ---- FACULTY ADVISOR SECTION ---- */}
      <section className="section">
        <div className="wrap">
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
