import React from 'react';
import { motion } from 'framer-motion';
import MemberSocialLinks from './MemberSocialLinks';
import './LeadershipSection.css';

export default function LeadershipSection({ members = [], onSelectMember }) {
  // We expect President, Vice President, General Secretary
  // If static or db has them, display them
  if (!members || members.length === 0) return null;

  return (
    <section className="leadership-section" id="the-leadership">
      <div className="wrap">
        
        {/* Section Head */}
        <div className="leadership-section__head">
          <span className="eyebrow leadership-section__eyebrow">Executive Board</span>
          <h2 className="leadership-section__title">THE LEADERSHIP</h2>
          <p className="leadership-section__subtitle">
            The people shaping the vision and direction of Abhyudaya.
          </p>
        </div>

        {/* 3 Prominent Cards Grid */}
        <div className="leadership-grid">
          {members.map((person, idx) => {
            const avatarFallback =
              'https://ui-avatars.com/api/?name=' +
              encodeURIComponent(person.name) +
              '&background=161d3a&color=eeb84a&size=500';

            const isPresident = (person.role || '').toLowerCase().includes('president') && !(person.role || '').toLowerCase().includes('vice');

            return (
              <motion.div
                key={person.id || person.name || idx}
                className={`leadership-card ${isPresident ? 'leadership-card--featured' : ''}`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: idx * 0.12 }}
                onClick={() => onSelectMember && onSelectMember(person)}
              >
                {/* Visual Top Glow & Accent */}
                <div className="leadership-card__top-glow" />

                {/* Profile Media */}
                <div className="leadership-card__media">
                  <div className="leadership-card__avatar-frame">
                    <img
                      src={person.image || avatarFallback}
                      alt={`${person.name} — ${person.role}`}
                      className="leadership-card__image"
                      loading="lazy"
                      onError={(e) => {
                        e.target.src = avatarFallback;
                      }}
                    />
                  </div>
                  <span className="leadership-card__role-badge">
                    {person.role}
                  </span>
                </div>

                {/* Card Content */}
                <div className="leadership-card__content">
                  <h3 className="leadership-card__name">{person.name}</h3>

                  <p className="leadership-card__dept">
                    Executive Governance • 2026
                  </p>

                  <p className="leadership-card__bio">
                    {person.bio ||
                      'Leading institutional initiatives, multidisciplinary programs, and organizational scale.'}
                  </p>

                  {/* Social System */}
                  <div className="leadership-card__footer">
                    <MemberSocialLinks
                      linkedin={person.linkedin}
                      github={person.github}
                      memberName={person.name}
                      variant="compact"
                    />

                    <button
                      type="button"
                      className="leadership-card__details-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectMember && onSelectMember(person);
                      }}
                      aria-label={`View full profile for ${person.name}`}
                    >
                      View Profile →
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
