import React from 'react';
import { motion } from 'framer-motion';
import { FaLinkedinIn } from 'react-icons/fa';
import { HiOutlineSparkles } from 'react-icons/hi2';
import './FacultyAdvisorSection.css';

export default function FacultyAdvisorSection({ advisor, onSelectMember }) {
  if (!advisor) return null;

  const avatarFallback =
    'https://ui-avatars.com/api/?name=' +
    encodeURIComponent(advisor.name) +
    '&background=0D8ABC&color=fff&size=600';

  const hasLinkedin = Boolean(advisor.linkedin && advisor.linkedin.trim() !== '');

  return (
    <section className="faculty-section" id="faculty-advisor">
      <div className="wrap">
        
        {/* Section Header */}
        <div className="faculty-section__head">
          <div className="faculty-section__eyebrow-wrap">
            <HiOutlineSparkles className="faculty-section__sparkle" />
            <span className="eyebrow">Academic Mentorship &amp; Guidance</span>
          </div>
          <h2 className="faculty-section__title">FACULTY ADVISOR</h2>
          <p className="faculty-section__subtitle">
            Providing visionary institutional mentorship, academic stewardship, and strategic backing to student leaders.
          </p>
        </div>

        {/* Faculty Advisor Card */}
        <motion.div
          className="faculty-card"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6 }}
          onClick={() => onSelectMember && onSelectMember(advisor)}
        >
          <div className="faculty-card__grid">
            
            {/* Portrait Photo */}
            <div className="faculty-card__media">
              <div className="faculty-card__photo-frame">
                <img
                  src={advisor.image || avatarFallback}
                  alt={`${advisor.name} — Faculty Advisor`}
                  className="faculty-card__image"
                  loading="lazy"
                  onError={(e) => {
                    e.target.src = avatarFallback;
                  }}
                />
              </div>
              <div className="faculty-card__badge">
                Faculty Advisor
              </div>
            </div>

            {/* Content & Details */}
            <div className="faculty-card__body">
              <div className="faculty-card__dept">
                {advisor.department || 'Department of Basic Sciences & Humanities'}
              </div>

              <h3 className="faculty-card__name">
                {advisor.name}
              </h3>

              <p className="faculty-card__role">
                Faculty Advisor &amp; Coordinator
              </p>

              <p className="faculty-card__bio">
                {advisor.bio ||
                  'Mentoring the students of Abhyudaya Club to cultivate leadership, interdisciplinary innovation, scientific inquiry, and organizational excellence across the institution.'}
              </p>

              <div className="faculty-card__actions">
                {hasLinkedin ? (
                  <a
                    href={advisor.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="faculty-card__linkedin-btn"
                    aria-label={`${advisor.name} on LinkedIn`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FaLinkedinIn className="faculty-card__linkedin-icon" />
                    <span>Connect on LinkedIn</span>
                    <span className="faculty-card__arrow">→</span>
                  </a>
                ) : (
                  <span className="faculty-card__dept-pill">MPEC Kanpur</span>
                )}

                <button
                  type="button"
                  className="faculty-card__view-btn"
                  onClick={() => onSelectMember && onSelectMember(advisor)}
                  aria-label={`View full profile of ${advisor.name}`}
                >
                  View Profile
                </button>
              </div>
            </div>

          </div>
        </motion.div>

      </div>
    </section>
  );
}
