import { team } from '../data/club.js'
import PageHero from '../components/PageHero.jsx'
import './Team.css'

function initials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function TeamCard({ person }) {
  return (
    <div className="team-card">
      <div className="team-card__avatar">{initials(person.name)}</div>
      <p className="team-card__name">{person.name}</p>
      <p className="team-card__role">{person.role}</p>
    </div>
  )
}

export default function Team() {
  return (
    <>
      <PageHero
        eyebrow="Who runs it"
        title="The people behind Abhyudaya."
        lede="A faculty coordinator and a student core team plan and run every event. This roster is a placeholder — drop in real names and photos here."
      />

      <section className="section">
        <div className="wrap">
          <div className="section__head">
            <p className="eyebrow">Faculty coordinator</p>
            <h2>Department of Basic Sciences &amp; Humanities</h2>
          </div>
          <div className="team-grid team-grid--faculty">
            {team.faculty.map((person) => (
              <TeamCard person={person} key={person.name} />
            ))}
          </div>
        </div>
      </section>

      <section className="section section--dark">
        <div className="wrap">
          <div className="section__head">
            <p className="eyebrow">Core team</p>
            <h2>Student leadership</h2>
          </div>
          <div className="team-grid">
            {team.core.map((person) => (
              <TeamCard person={person} key={person.name} />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
