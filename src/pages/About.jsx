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
    text: 'You don\u2019t need to be a CSE student to belong here. Abhyudaya runs under the Department of Basic Sciences & Humanities precisely so first-years and every discipline have a way in.',
  },
  {
    title: 'Our Values',
    text: 'Curiosity, Creativity, Innovation, Leadership, Teamwork, Inclusivity, Integrity, Responsibility, and Respect for Diverse Perspectives guide everything we do.',
  },
]

export default function About() {
  return (
    <>
      <PageHero
        eyebrow="About the club"
        title="An idea, given room to rise."
        lede={club.meaning || "A Science and Literary Club committed to creating a space where curiosity, creativity, and continuous learning come together."}
        eyebrow="About Abhyudaya"
        title="Empowering Innovation, Creativity & Leadership"
        lede="Abhyudaya is the Science & Literary Club of Maharana Pratap Engineering College (MPEC), Kanpur, dedicated to fostering curiosity, creativity, innovation, and lifelong learning."
      />

      {/* Intro Section: Who We Are & Our Purpose */}
      <section className="section">
        <div className="wrap about-body">
          <div className="about-body__col">
            <p className="eyebrow">Who We Are</p>
            <h2>A Space for Curiosity</h2>
            <p className="eyebrow">Who We Are</p>
            <h2>{club.institute}</h2>
            <p className="about-body__text">
              Abhyudaya is a Science and Literary Club that welcomes students with diverse 
              interests and encourages them to explore ideas, exchange perspectives, and grow 
              through meaningful interactions. We believe that learning is not limited to 
              classrooms; every conversation and new idea has the potential to inspire growth.
              Abhyudaya operates under the {club.department} and serves as a
              platform where students from all branches can explore science,
              technology, literature, and creativity. We encourage innovation,
              leadership, collaboration, and continuous learning by creating an
              environment where every student has the opportunity to grow beyond
              academics.
            </p>
          </div>

          <div className="about-body__col">
            <p className="eyebrow">Our Purpose</p>
            <h2>Bridging Two Worlds</h2>
            <p className="eyebrow">What We Do</p>
            <h2>Learning Beyond Classrooms</h2>
            <p className="about-body__text">
              We strive to encourage intellectual curiosity and creative expression by bringing 
              together the worlds of science and literary pursuits. Our focus is on building 
              an environment where learning becomes enjoyable, inclusive, and accessible to 
              everyone while helping students think critically and communicate effectively.
              Throughout the academic year, Abhyudaya organizes technical
              festivals, coding competitions, workshops, guest lectures,
              business pitch competitions, poster presentations, quizzes,
              astronomy sessions, innovation challenges, and literary events.
              Every activity is designed to help students develop practical
              skills, confidence, teamwork, and real-world experience.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section__head">
            <p className="eyebrow">Our Community</p>
            <h2>Where Every Idea Matters</h2>
          </div>

          <p className="about-body__text">
            We believe education extends far beyond the classroom. Whether you
            are passionate about science, technology, literature, design,
            public speaking, innovation, or simply eager to learn something
            new, Abhyudaya welcomes you. Every member is encouraged to ask
            questions, share ideas, collaborate with others, and contribute to
            building a vibrant learning community where every voice is valued.
          </p>
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
            <p className="eyebrow">Our Foundation</p>
            <h2>Mission, Vision & Values</h2>
          </div>

          <div className="pillars">
            {pillars.map((pillar, index) => (
              <div className="pillar" key={pillar.title}>
                <span className="pillar__index">
                  {String(index + 1).padStart(2, '0')}
                </span>

                <h3>{pillar.title}</h3>
                <p>{pillar.text}</p>
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