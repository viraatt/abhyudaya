import { club } from '../data/club.js'
import PageHero from '../components/PageHero.jsx'
import './About.css'

const pillars = [
  {
    title: 'Build, don\u2019t just attend',
    text: 'Every event is designed around making something \u2014 a poster, a pitch, a working site, a flying model \u2014 rather than sitting through a lecture.',
  },
  {
    title: 'Open to every branch',
    text: 'You don\u2019t need to be a CSE student to belong here. Abhyudaya runs under the Department of Basic Sciences & Humanities precisely so first-years and every discipline have a way in.',
  },
  {
    title: 'Run by students, for students',
    text: 'The core team plans, budgets, and runs every fest and workshop, with faculty guidance rather than faculty control.',
  },
]

export default function About() {
  return (
    <>
      <PageHero
        eyebrow="About the club"
        title="An idea, given room to rise."
        lede={club.meaning}
      />

      <section className="section">
        <div className="wrap about-body">
          <div className="about-body__col">
            <p className="eyebrow">Our home</p>
            <h2>{club.institute}</h2>
            <p className="about-body__text">
              Abhyudaya sits under the {club.department} at MPEC Kanpur. That
              placement is deliberate: it means the club isn't tied to one
              engineering branch, and any student on campus, from any year,
              has a natural way to walk in.
            </p>
          </div>
          <div className="about-body__col">
            <p className="eyebrow">What we run</p>
            <h2>Fests, workshops, competitions</h2>
            <p className="about-body__text">
              Our flagship is TechBloom, an annual technical fest that pairs
              speaker sessions with hands-on workshops and competitions. Across
              the year we also run smaller quizzes, design contests, pitch
              events, and skill workshops for anyone who wants to keep
              building between fests.
            </p>
          </div>
        </div>
      </section>

      <section className="section section--dark">
        <div className="wrap">
          <div className="section__head">
            <p className="eyebrow">How we work</p>
            <h2>Three things we hold onto</h2>
          </div>
          <div className="pillars">
            {pillars.map((p, i) => (
              <div className="pillar" key={p.title}>
                <span className="pillar__index">{String(i + 1).padStart(2, '0')}</span>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
