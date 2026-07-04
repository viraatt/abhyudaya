import './JoinClub.css'

export default function JoinClub() {
  return (
    <main className="join-page">

      {/* Hero Section */}
      <section className="join-hero">
        <div className="wrap">
          <span className="join-tag">JOIN ABHYUDAYA</span>

          <h1>Become a Part of Something Bigger</h1>

          <p>
            Join Abhyudaya Club and work alongside passionate students to
            organize technical events, competitions, workshops, cultural
            activities, and innovative projects that create a lasting impact on
            campus.
          </p>

          <a
            href="https://forms.gle/Uy36JEjFCprqhhYM6"
            target="_blank"
            rel="noopener noreferrer"
            className="join-btn"
          >
            Apply Now
          </a>
        </div>
      </section>

      {/* Why Join */}
      <section className="join-section">
        <div className="wrap">

          <h2>Why Join Abhyudaya?</h2>

          <div className="join-grid">

            <div className="join-card">
              <h3>🚀 Leadership</h3>
              <p>
                Take responsibility for organizing college-level events and
                leading teams.
              </p>
            </div>

            <div className="join-card">
              <h3>🤝 Networking</h3>
              <p>
                Connect with faculty, alumni, startups, and industry experts.
              </p>
            </div>

            <div className="join-card">
              <h3>💻 Skill Development</h3>
              <p>
                Improve communication, management, design, technical, and
                teamwork skills.
              </p>
            </div>

            <div className="join-card">
              <h3>🏆 Recognition</h3>
              <p>
                Receive certificates, appreciation, and opportunities to build
                an impressive resume.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Domains */}
      <section className="join-section light">

        <div className="wrap">

          <h2>Choose Your Domain</h2>

          <div className="domain-grid">

            <div className="domain-card">
              <h3>💻 Technical</h3>
              <p>Website Development, Coding, Automation, Innovation</p>
            </div>

            <div className="domain-card">
              <h3>🎨 Creative</h3>
              <p>Graphic Design, Posters, Branding & Social Media</p>
            </div>

            <div className="domain-card">
              <h3>📸 Photography & Media</h3>
              <p>Photography, Videography & Editing</p>
            </div>

            <div className="domain-card">
              <h3>📢 Public Relations</h3>
              <p>Promotion, Outreach & Sponsorship</p>
            </div>

            <div className="domain-card">
              <h3>⚙ Operations</h3>
              <p>Event Management & Execution</p>
            </div>

            <div className="domain-card">
              <h3>🎤 Anchoring</h3>
              <p>Hosting Events & Public Speaking</p>
            </div>

          </div>

        </div>

      </section>

      {/* Recruitment Process */}

      <section className="join-section">

        <div className="wrap">

          <h2>Recruitment Process</h2>

          <div className="process">

            <div className="step">
              <span>1</span>
              <h3>Apply</h3>
              <p>Fill out the recruitment form.</p>
            </div>

            <div className="step">
              <span>2</span>
              <h3>Screening</h3>
              <p>Applications will be reviewed by the club team.</p>
            </div>

            <div className="step">
              <span>3</span>
              <h3>Interview</h3>
              <p>Shortlisted students will be invited for interaction.</p>
            </div>

            <div className="step">
              <span>4</span>
              <h3>Welcome</h3>
              <p>Become an official member of Abhyudaya Club.</p>
            </div>

          </div>

        </div>

      </section>

      {/* CTA */}

      <section className="join-cta">

        <div className="wrap">

          <h2>Ready to Shape the Future?</h2>

          <p>
            We are looking for enthusiastic students who are eager to learn,
            contribute, and make a difference.
          </p>

          <a
            href="https://forms.gle/YOUR_GOOGLE_FORM_LINK"
            target="_blank"
            rel="noopener noreferrer"
            className="join-btn"
          >
            Join Abhyudaya Club
          </a>

        </div>

      </section>

    </main>
  )
}
