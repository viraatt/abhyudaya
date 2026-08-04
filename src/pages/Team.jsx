import { team } from '../data/club.js'
import { Helmet } from 'react-helmet-async'
import PageHero from '../components/PageHero.jsx'
import './Team.css'

function TeamCard({ person }) {
  return (
    <div className="team-card">
      <img
        src={person.image}
        alt={person.name}
        className="team-card__image"
        onError={(e) => {
          e.target.src =
            "https://ui-avatars.com/api/?name=" +
            encodeURIComponent(person.name) +
            "&background=0D8ABC&color=fff&size=500"
        }}
      />

      <div className="team-card__content">
        <h3 className="team-card__name">{person.name}</h3>

        <p className="team-card__role">{person.role}</p>

        <a
          href={person.linkedin || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="team-card__linkedin"
          style={{
            pointerEvents: person.linkedin ? "auto" : "none",
            opacity: person.linkedin ? 1 : 0.5,
          }}
        >
          LinkedIn
        </a>
      </div>
    </div>
  )
}

export default function Team() {
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

      <section className="section">
        <div className="wrap">
          <div className="section__head">
            <p className="eyebrow">Faculty Advisor</p>
            <h2>Department of Basic Sciences & Humanities</h2>
          </div>

          <div className="team-grid team-grid--faculty">
            {team.faculty.map((person) => (
              <TeamCard key={person.name} person={person} />
            ))}
          </div>
        </div>
      </section>

      <section className="section section--dark">
        <div className="wrap">
          <div className="section__head">
            <p className="eyebrow">Student Leadership</p>
            <h2>Core Team</h2>
          </div>

          <div className="team-grid">
            {team.core.map((person) => (
              <TeamCard key={person.name} person={person} />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
