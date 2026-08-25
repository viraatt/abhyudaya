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
        
        {/* Section Head */}
        <div className="core-team-section__head">
          <span className="eyebrow core-team-section__eyebrow">Domain Leadership</span>
          <h2 className="core-team-section__title">THE CORE TEAM</h2>
          <p className="core-team-section__subtitle">
            Leading domain verticals, technical execution, stage logistics, and community outreach.
          </p>
        </div>

        {/* 3 Core Leads Grid */}
        <div className="core-team-grid">
          {members.map((person, idx) => {
            const avatarFallback =
              'https://ui-avatars.com/api/?name=' +
              encodeURIComponent(person.name) +
              '&background=161d3a&color=eeb84a&size=500';

            return (
              <motion.div
                key={person.id || person.name || idx}
                className="core-team-card"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
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
                    <span className="core-team-card__arrow-box">
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

                    <span className="core-team-card__view-text">
                      View Profile
                    </span>
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
