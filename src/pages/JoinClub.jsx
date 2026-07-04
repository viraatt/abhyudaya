import "./JoinClub.css";

export default function JoinClub() {
  return (
    <main className="join-page">
      {/* Hero */}
      <section className="join-hero">
        <div className="wrap">
          <span className="join-tag">JOIN ABHYUDAYA CLUB</span>

          <h1>Become a Part of Something Bigger</h1>

          <p>
            Join the official Science & Literary Club of Maharana Pratap
            Engineering College and contribute to exciting technical, cultural,
            literary, and social initiatives.
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
                Organize college-level events, competitions and workshops while
                developing leadership skills.
              </p>
            </div>

            <div className="join-card">
              <h3>💻 Skill Development</h3>
              <p>
                Improve communication, technical knowledge, teamwork and event
                management.
              </p>
            </div>

            <div className="join-card">
              <h3>🤝 Networking</h3>
              <p>
                Connect with faculty members, alumni, industry experts and
                fellow innovators.
              </p>
            </div>

            <div className="join-card">
              <h3>🏆 Recognition</h3>
              <p>
                Earn certificates, gain experience and build an impressive
                portfolio.
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
              <h3>💻 Technical Team</h3>
              <p>
                Website Development, Coding, Automation, Technical Support
              </p>
            </div>

            <div className="domain-card">
              <h3>🎨 Creative Team</h3>
              <p>
                Posters, Branding, Graphic Design, Social Media Content
              </p>
            </div>

            <div className="domain-card">
              <h3>📢 PR Team</h3>
              <p>
                Sponsorships, Outreach, Collaborations and Public Relations
              </p>
            </div>

            <div className="domain-card">
              <h3>📸 Media Team</h3>
              <p>
                Photography, Videography, Reels and Video Editing
              </p>
            </div>

            <div className="domain-card">
              <h3>⚙ Operations</h3>
              <p>
                Event Planning, Logistics, Stage Management and Coordination
              </p>
            </div>

            <div className="domain-card">
              <h3>🎤 Anchoring</h3>
              <p>
                Event Hosting, Public Speaking and Stage Management
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="join-section">
        <div className="wrap">
          <h2>Member Benefits</h2>

          <div className="join-grid">
            <div className="join-card">
              <h3>📜 Certificates</h3>
              <p>Get official certificates for your contribution.</p>
            </div>

            <div className="join-card">
              <h3>🌟 Portfolio</h3>
              <p>Work on real projects that strengthen your resume.</p>
            </div>

            <div className="join-card">
              <h3>🎯 Learning</h3>
              <p>
                Learn by working with experienced seniors and faculty members.
              </p>
            </div>

            <div className="join-card">
              <h3>❤️ Community</h3>
              <p>
                Become part of one of MPEC's most active student communities.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Recruitment */}
      <section className="join-section light">
        <div className="wrap">
          <h2>Recruitment Process</h2>

          <div className="process">
            <div className="step">
              <span>1</span>
              <h3>Apply</h3>
              <p>Submit the Google Form.</p>
            </div>

            <div className="step">
              <span>2</span>
              <h3>Shortlisting</h3>
              <p>Applications will be reviewed by the core team.</p>
            </div>

            <div className="step">
              <span>3</span>
              <h3>Interaction</h3>
              <p>
                Selected students will be invited for a short interaction.
              </p>
            </div>

            <div className="step">
              <span>4</span>
              <h3>Welcome</h3>
              <p>Become an official member of Abhyudaya Club.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="join-section">
        <div className="wrap">
          <h2>Frequently Asked Questions</h2>

          <div className="faq-item">
            <h3>Who can join?</h3>
            <p>Any student of MPEC with enthusiasm to learn and contribute.</p>
          </div>

          <div className="faq-item">
            <h3>Do I need prior experience?</h3>
            <p>No. Beginners are welcome. We believe in learning together.</p>
          </div>

          <div className="faq-item">
            <h3>Can I join multiple teams?</h3>
            <p>
              Yes, depending on your interest and availability, you may
              contribute across multiple domains.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="join-cta">
        <div className="wrap">
          <h2>Ready to Join Abhyudaya?</h2>

          <p>
            Start your journey with a community that believes in learning,
            leadership and innovation.
          </p>

          <a
            href="https://forms.gle/Uy36JEjFCprqhhYM6"
            target="_blank"
            rel="noopener noreferrer"
            className="join-btn"
          >
            Join the Club
          </a>
        </div>
      </section>
    </main>
  );
}
