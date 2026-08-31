import React from 'react';
import { motion } from 'framer-motion';
import { HiOutlineArrowUpRight, HiOutlineCodeBracket } from 'react-icons/hi2';
import MemberSocialLinks from './MemberSocialLinks';
import './WebDevTeamSection.css';

export default function WebDevTeamSection({ members = [], onSelectMember }) {
  if (!members || members.length === 0) return null;

  return (
    <section className="webdev-team-section" id="web-development-team">
      <div className="wrap">
        
        {/* Section Head with Editorial Hierarchy & Gold Divider */}
        <motion.div 
          className="webdev-team-section__head"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="webdev-team-section__eyebrow-wrap">
            <span className="eyebrow webdev-team-section__eyebrow">
              <HiOutlineCodeBracket className="webdev-team-section__eyebrow-icon" />
              Digital Architecture &amp; Engineering
            </span>
            <span className="webdev-team-section__gold-divider" aria-hidden="true" />
          </div>

          <h2 className="webdev-team-section__title">WEB DEVELOPMENT TEAM</h2>
          
          <p className="webdev-team-section__subtitle">
            The engineers and developers crafting high-performance web platforms, interactive digital experiences, and scalable solutions for Abhyudaya Club.
          </p>
        </motion.div>

        {/* Responsive Grid for Web Development Team Members */}
        <div className="webdev-team-grid">
          {members.map((person, idx) => {
            const avatarFallback =
              'https://ui-avatars.com/api/?name=' +
              encodeURIComponent(person.name) +
              '&background=0d1224&color=eeb84a&size=500&bold=true';

            return (
              <motion.div
                key={person.id || person.name || idx}
                className="webdev-team-card"
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.55, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => onSelectMember && onSelectMember(person)}
              >
                {/* Image Container */}
                <div className="webdev-team-card__image-container">
                  <img
                    src={person.image || avatarFallback}
                    alt={`${person.name} — ${person.role}`}
                    className="webdev-team-card__img"
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = avatarFallback;
                    }}
                  />
                  <div className="webdev-team-card__dept-chip">
                    {person.department || 'Web Dev'}
                  </div>
                </div>

                {/* Body Content */}
                <div className="webdev-team-card__body">
                  <div className="webdev-team-card__role-row">
                    <span className="webdev-team-card__role">{person.role || 'Web Developer'}</span>
                    <span className="webdev-team-card__arrow-box" aria-hidden="true">
                      <HiOutlineArrowUpRight className="webdev-team-card__arrow" />
                    </span>
                  </div>

                  <h3 className="webdev-team-card__name">{person.name}</h3>

                  <p className="webdev-team-card__bio">
                    {person.bio || 'Building modern, scalable and interactive web experiences for Abhyudaya Club.'}
                  </p>

                  <div className="webdev-team-card__footer">
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
