import { motion } from "framer-motion";
import { club } from "../data/club.js";
import { Helmet } from "react-helmet-async";
import PageHero from "../components/PageHero.jsx";
import BreadcrumbSchema from "../components/seo/schemas/BreadcrumbSchema.jsx";
import "./About.css";

const SITE_URL = "https://www.abhyudayaclub.in";

const slideFromLeft = {
  hidden: { opacity: 0, x: -50 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
  },
};

const slideFromRight = {
  hidden: { opacity: 0, x: 50 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
  },
};

export default function About() {
  const breadcrumbItems = [
    { name: "Home", url: SITE_URL },
    { name: "About", url: `${SITE_URL}/about` },
  ];

  const aboutSchema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About Abhyudaya Club",
    description: "Learn about Abhyudaya Club — the Science & Literary Club of Maharana Pratap Engineering College (MPEC) Kanpur, our mission, values, and community.",
    url: `${SITE_URL}/about`,
    mainEntity: {
      "@id": `${SITE_URL}/#organization`,
    },
  };

  return (
    <>
      <Helmet>
        <title>About Us | Abhyudaya Club — Science & Literary Club of MPEC Kanpur</title>
        <meta name="description" content="Learn about Abhyudaya Club — the Science & Literary Club of Maharana Pratap Engineering College (MPEC) Kanpur, our mission, values, and community." />
        <link rel="canonical" href={`${SITE_URL}/about`} />
        <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1" />

        <meta property="og:type" content="website" />
        <meta property="og:title" content="About Abhyudaya Club | MPEC Kanpur" />
        <meta property="og:description" content="Empowering innovation, creativity and leadership at MPEC Kanpur since our founding." />
        <meta property="og:url" content={`${SITE_URL}/about`} />
        <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
        <meta property="og:locale" content="en_IN" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="About Abhyudaya Club | MPEC Kanpur" />
        <meta name="twitter:description" content="Empowering innovation, creativity and leadership at MPEC Kanpur." />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.png`} />

        <script type="application/ld+json">
          {JSON.stringify(aboutSchema)}
        </script>
      </Helmet>

      <BreadcrumbSchema items={breadcrumbItems} />

      <PageHero
        eyebrow="About Abhyudaya"
        title="Empowering Innovation, Creativity & Leadership"
        lede={
          club.meaning ||
          "Abhyudaya is the Science & Literary Club of Maharana Pratap Group of Institutions (MPGI), Kanpur, dedicated to fostering curiosity, creativity, innovation, and lifelong learning."
        }
      />

      <section className="timeline-section">
        <div className="timeline-container">
          <div className="timeline-spine" />

          {/* Block 1: Who We Are (Left) */}
          <motion.div
            className="timeline-item timeline-item--left"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={slideFromLeft}
          >
            <div className="timeline-node" />
            <div className="timeline-block">
              <span className="timeline-index">01 &middot; Who We Are</span>
              <h2 className="fibo-h2">{club.institute}</h2>
              <div className="timeline-divider" />
              <p className="fibo-body">
                Abhyudaya is the Science & Literary Club of {club.institute},
                operating under the {club.department}. The club provides a
                platform where students from every branch can explore science,
                technology, literature, innovation, and creativity beyond the
                classroom.
              </p>
            </div>
          </motion.div>

          {/* Block 2: What We Do (Right) */}
          <motion.div
            className="timeline-item timeline-item--right"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={slideFromRight}
          >
            <div className="timeline-node" />
            <div className="timeline-block">
              <span className="timeline-index">02 &middot; What We Do</span>
              <h2 className="fibo-h2">Learning Beyond Classrooms</h2>
              <div className="timeline-divider" />
              <p className="fibo-body">
                Throughout the academic year, Abhyudaya organizes technical
                festivals, coding competitions, workshops, guest lectures,
                business pitch competitions, poster presentations, quizzes,
                and astronomy sessions.
              </p>
            </div>
          </motion.div>

          {/* Block 3: Pillar 1 (Left) */}
          <motion.div
            className="timeline-item timeline-item--left"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={slideFromLeft}
          >
            <div className="timeline-node" />
            <div className="timeline-block">
              <span className="timeline-index">03 &middot; Pillar</span>
              <h2 className="fibo-h2">Build, Don't Just Attend</h2>
              <div className="timeline-divider" />
              <p className="fibo-body">
                Every event is designed around creating something
                meaningful—whether it's a website, a research idea, a poster,
                a business pitch, or an innovative solution. We believe
                learning happens best through hands-on experiences.
              </p>
            </div>
          </motion.div>

          {/* Block 4: Pillar 2 (Right) */}
          <motion.div
            className="timeline-item timeline-item--right"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={slideFromRight}
          >
            <div className="timeline-node" />
            <div className="timeline-block">
              <span className="timeline-index">04 &middot; Inclusivity</span>
              <h2 className="fibo-h2">Open to Every Branch</h2>
              <div className="timeline-divider" />
              <p className="fibo-body">
                Abhyudaya welcomes students from every discipline. Operating
                under the Department of Basic Sciences & Humanities, the club
                provides opportunities for every student to explore, collaborate,
                and grow together.
              </p>
            </div>
          </motion.div>

          {/* Block 5: Pillar 3 (Left) */}
          <motion.div
            className="timeline-item timeline-item--left"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={slideFromLeft}
          >
            <div className="timeline-node" />
            <div className="timeline-block">
              <span className="timeline-index">05 &middot; Principles</span>
              <h2 className="fibo-h2">Our Core Values</h2>
              <div className="timeline-divider" />
              <p className="fibo-body">
                Curiosity, Creativity, Innovation, Leadership, Teamwork,
                Inclusivity, Integrity, Responsibility, and Respect for Diverse
                Perspectives guide everything we do.
              </p>
            </div>
          </motion.div>

          {/* Block 6: Philosophy (Right) */}
          <motion.div
            className="timeline-item timeline-item--right"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={slideFromRight}
          >
            <div className="timeline-node" />
            <div className="timeline-block">
              <span className="timeline-index">06 &middot; Philosophy</span>
              <h2 className="fibo-h2">Science Meets Creativity</h2>
              <div className="timeline-divider" />
              <p className="fibo-body">
                Science teaches us to question, observe, and innovate, while
                literature helps us communicate ideas and experiences effectively.
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}