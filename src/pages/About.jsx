import { club } from "../data/club.js";
import PageHero from "../components/PageHero.jsx";
import "./About.css";

const pillars = [
  {
    title: "Build, Don't Just Attend",
    text: "Every event is designed around creating something meaningful—whether it's a website, a research idea, a poster, a business pitch, or an innovative solution. We believe learning happens best through hands-on experiences.",
  },
  {
    title: "Open to Every Branch",
    text: "Abhyudaya welcomes students from every discipline. Operating under the Department of Basic Sciences & Humanities, the club provides opportunities for every student to explore, collaborate, and grow together.",
  },
  {
    title: "Our Values",
    text: "Curiosity, Creativity, Innovation, Leadership, Teamwork, Inclusivity, Integrity, Responsibility, and Respect for Diverse Perspectives guide everything we do.",
  },
];

export default function About() {
  return (
    <>
      <PageHero
        eyebrow="About Abhyudaya"
        title="Empowering Innovation, Creativity & Leadership"
        lede={
          club.meaning ||
          "Abhyudaya is the Science & Literary Club of Maharana Pratap Engineering College (MPEC), Kanpur, dedicated to fostering curiosity, creativity, innovation, and lifelong learning."
        }
      />

      {/* About Section */}
      <section className="section">
        <div className="wrap about-body">
          <div className="about-body__col">
            <p className="eyebrow">Who We Are</p>
            <h2>{club.institute}</h2>

            <p className="about-body__text">
              Abhyudaya is the Science & Literary Club of {club.institute},
              operating under the {club.department}. The club provides a
              platform where students from every branch can explore science,
              technology, literature, innovation, and creativity beyond the
              classroom.
            </p>

            <p className="about-body__text">
              We believe learning is not limited to textbooks. Every
              conversation, project, workshop, and competition becomes an
              opportunity to discover new ideas, build practical skills, and
              develop confidence.
            </p>
          </div>

          <div className="about-body__col">
            <p className="eyebrow">What We Do</p>
            <h2>Learning Beyond Classrooms</h2>

            <p className="about-body__text">
              Throughout the academic year, Abhyudaya organizes technical
              festivals, coding competitions, workshops, guest lectures,
              business pitch competitions, poster presentations, quizzes,
              astronomy sessions, innovation challenges, literary events, and
              collaborative learning activities.
            </p>

            <p className="about-body__text">
              Every initiative is designed to help students strengthen their
              technical knowledge, communication, leadership, teamwork,
              creativity, and problem-solving skills while preparing them for
              real-world challenges.
            </p>
          </div>
        </div>
      </section>

      {/* Community */}
      <section className="section">
        <div className="wrap">
          <div className="section__head">
            <p className="eyebrow">Our Community</p>
            <h2>Where Every Idea Matters</h2>
          </div>

          <p className="about-body__text">
            Whether your interests lie in science, technology, literature,
            public speaking, design, entrepreneurship, research, or innovation,
            Abhyudaya welcomes you. Every member is encouraged to ask questions,
            share ideas, collaborate with peers, and contribute to a vibrant
            learning community where every voice matters.
          </p>
        </div>
      </section>

      {/* Philosophy */}
      <section className="section section--light-gray">
        <div className="wrap about-body">
          <div className="about-body__col">
            <p className="eyebrow">What We Believe</p>
            <h2>Science Meets Creativity</h2>

            <p className="about-body__text">
              Science teaches us to question, observe, and innovate, while
              literature helps us communicate ideas, emotions, and experiences.
              Together, they inspire balanced thinking, creativity, empathy,
              and collaboration—qualities that shape responsible future
              leaders.
            </p>
          </div>

          <div className="about-body__col">
            <p className="eyebrow">Our Core Values</p>
            <h2>What Guides Us</h2>

            <ul
              className="about-values__list"
              style={{ paddingLeft: "1.25rem", marginTop: "1rem" }}
            >
              <li>Curiosity & Lifelong Learning</li>
              <li>Creativity & Innovation</li>
              <li>Leadership & Responsibility</li>
              <li>Teamwork & Collaboration</li>
              <li>Inclusivity & Mutual Respect</li>
              <li>Integrity & Professional Ethics</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Mission Vision */}
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
                  {String(index + 1).padStart(2, "0")}
                </span>

                <h3>{pillar.title}</h3>
                <p>{pillar.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Future */}
      <section className="section section--brief">
        <div
          className="wrap text-center"
          style={{
            textAlign: "center",
            maxWidth: "750px",
            margin: "0 auto",
          }}
        >
          <p className="eyebrow">Looking Ahead</p>
          <h2>Building Tomorrow Together</h2>

          <p className="about-body__text">
            As Abhyudaya continues to grow, our commitment remains unchanged—to
            inspire curiosity, encourage innovation, nurture leadership, and
            create opportunities where every student can learn, contribute, and
            make a meaningful impact. Together, we strive to build a community
            that empowers ideas and transforms potential into achievement.
          </p>
        </div>
      </section>
    </>
  );
}
