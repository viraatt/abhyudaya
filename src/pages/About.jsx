import { club } from '../data/club.js'
import PageHero from '../components/PageHero.jsx'
import './About.css'

const pillars = [
  {
    title: 'Build, don’t just attend',
    text: 'Every event is designed around making something — a poster, a pitch, a working site, a flying model — rather than sitting through a lecture.',
  },
  {
    title: 'Open to every branch',
    text: 'You don’t need to be a CSE student to belong here. Abhyudaya runs under the Department of Basic Sciences & Humanities precisely so first-years and every discipline have a way in.',
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
        lede={club.meaning || "A Science and Literary Club committed to creating a space where curiosity, creativity, and continuous learning come together."}
      />

      {/* Intro Section: Who We Are & Our Purpose */}
      <section className="section">
        <div className="wrap about-body">
          <div className="about-body__col">
            <p className="eyebrow">Who We Are</p>
            <h2>A Space for Curiosity</h2>
            <p className="about-body__text">
              Abhyudaya is a Science and Literary Club that welcomes students with diverse 
              interests and encourages them to explore ideas, exchange perspectives, and grow 
              through meaningful interactions. We believe that learning is not limited to 
              classrooms; every conversation and new idea has the potential to inspire growth.
            </p>
          </div>
          <div className="about-body__col">
            <p className="eyebrow">Our Purpose</p>
            <h2>Bridging Two Worlds</h2>
            <p className="about-body__text">
              We strive to encourage intellectual curiosity and creative expression by bringing 
              together the worlds of science and literary pursuits. Our focus is on building 
              an environment where learning becomes enjoyable, inclusive, and accessible to 
              everyone while helping students think critically and communicate effectively.
            </p>
          </div>
        </div>
      </section>

      {/* Core Philosophy Section: Beliefs & Values */}
      <section className="section section--light-gray">
        <div className="wrap about-body">
          <div className="about-body__col">
            <p className="eyebrow">What We Believe</p>
            <h2>Science & Literature</h2>
            <p className="about-body__text">
              Science helps us understand the world through observation, reasoning, and discovery, 
              while literary pursuits allow us to express ideas, emotions, and experiences with 
              creativity. Together, these disciplines inspire balanced thinking, open-mindedness, 
              and a community that values collaboration over competition.
            </p>
          </div>
          <div className="about-body__col">
            <p className="eyebrow">Our Values</p>
            <h2>What Guides Us</h2>
            <ul className="about-values__list" style={{ paddingLeft: '1.2rem', margin: '1rem 0' }}>
              <li>Curiosity and lifelong learning</li>
              <li>Creativity and innovation</li>
              <li>Respect for diverse ideas and viewpoints</li>
              <li>Teamwork, collaboration, and inclusivity</li>
              <li>Integrity and mutual responsibility</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Pillars Section */}
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

      {/* Looking Ahead Footer Note */}
      <section className="section section--brief">
        <div className="wrap text-center" style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
          <p className="eyebrow">Looking Ahead</p>
          <h2>Thinking Beyond Boundaries</h2>
          <p className="about-body__text">
            As we continue to grow, Abhyudaya remains dedicated to fostering a culture of 
            exploration and personal development. Every idea matters, every voice is valued, 
            and every step toward learning is a step toward growth.
          </p>
        </div>
      </section>
    </>
  )
}