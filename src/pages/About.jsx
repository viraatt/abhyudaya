import { club } from '../data/club.js'
import PageHero from '../components/PageHero.jsx'
import './About.css'

const pillars = [
  {
    title: 'Our Mission',
    text: 'To inspire students to become innovative thinkers, effective communicators, and responsible leaders by creating opportunities for experiential learning, collaboration, and personal growth.',
  },
  {
    title: 'Our Vision',
    text: 'To build an inclusive community where science, technology, literature, and creativity come together to empower students, encourage lifelong learning, and develop future-ready leaders.',
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
        eyebrow="About Abhyudaya"
        title="Empowering Innovation, Creativity & Leadership"
        lede="Abhyudaya is the Science & Literary Club of Maharana Pratap Engineering College (MPEC), Kanpur, dedicated to fostering curiosity, creativity, innovation, and lifelong learning."
      />

      <section className="section">
        <div className="wrap about-body">
          <div className="about-body__col">
            <p className="eyebrow">Who We Are</p>
            <h2>{club.institute}</h2>
            <p className="about-body__text">
              Abhyudaya operates under the {club.department} and serves as a
              platform where students from all branches can explore science,
              technology, literature, and creativity. We encourage innovation,
              leadership, collaboration, and continuous learning by creating an
              environment where every student has the opportunity to grow beyond
              academics.
            </p>
          </div>

          <div className="about-body__col">
            <p className="eyebrow">What We Do</p>
            <h2>Learning Beyond Classrooms</h2>
            <p className="about-body__text">
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
    </>
  )
}
