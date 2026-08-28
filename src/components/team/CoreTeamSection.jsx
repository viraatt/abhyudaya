import React from 'react';
import { motion } from 'framer-motion';
import { HiOutlineArrowUpRight } from 'react-icons/hi2';
import MemberSocialLinks from './MemberSocialLinks';
import './CoreTeamSection.css';

export default function CoreTeamSection({ members = [], onSelectMember }) {
  if (!members || members.length === 0) return null;

  return (
    <section className="core-team-section" id="the-core-team">
      <div className="wrap">
        
        {/* Section Head with Editorial Hierarchy & Gold Divider */}
        <motion.div 
          className="core-team-section__head"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="core-team-section__eyebrow-wrap">
            <span className="eyebrow core-team-section__eyebrow">Domain Leadership</span>
            <span className="core-team-section__gold-divider" aria-hidden="true" />
          </div>

          <h2 className="core-team-section__title">THE CORE TEAM</h2>
          
          <p className="core-team-section__subtitle">
            Leading domain verticals, technical execution, stage logistics, and community outreach.
          </p>
        </motion.div>

        {/* 3 Core Leads Grid */}
        <div className="core-team-grid">
          {members.map((person, idx) => {
            const avatarFallback =
              'https://ui-avatars.com/api/?name=' +
              encodeURIComponent(person.name) +
              '&background=0d1224&color=eeb84a&size=500&bold=true';

            return (
              <motion.div
                key={person.id || person.name || idx}
                className="core-team-card"
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.55, delay: idx * 0.12, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => onSelectMember && onSelectMember(person)}
              >
                {/* Image Container */}
                <div className="core-team-card__image-container">
                  <img
                    src={person.image || avatarFallback}
                    alt={`${person.name} — ${person.role}`}
                    className="core-team-card__img"
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = avatarFallback;
                    }}
                  />
                  <div className="core-team-card__dept-chip">
                    {person.department || 'Domain Lead'}
                  </div>
                </div>

                {/* Body */}
                <div className="core-team-card__body">
                  <div className="core-team-card__role-row">
                    <span className="core-team-card__role">{person.role}</span>
                    <span className="core-team-card__arrow-box" aria-hidden="true">
                      <HiOutlineArrowUpRight className="core-team-card__arrow" />
                    </span>
                  </div>

                  <h3 className="core-team-card__name">{person.name}</h3>

                  <p className="core-team-card__bio">
                    {person.bio ||
                      'Driving domain-level excellence, technical mentorship, and high-impact event orchestration.'}
                  </p>

                  <div className="core-team-card__footer">
                    <MemberSocialLinks
                      linkedin={person.linkedin}
                      github={person.github}
                      memberName={person.name}
                      variant="compact"
                    />

                    <button
                      type="button"
                      className="member-view-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectMember && onSelectMember(person);
                      }}
                      aria-label={`View full profile for ${person.name}`}
                    >
                      <span>View Profile</span>
                      <span className="member-view-btn__arrow">→</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
