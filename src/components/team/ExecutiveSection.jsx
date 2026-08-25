import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MemberSocialLinks from './MemberSocialLinks';
import './ExecutiveSection.css';

export default function ExecutiveSection({ members = [], onSelectMember }) {
  const [activeFilter, setActiveFilter] = useState('ALL');

  const filterTabs = [
    { id: 'ALL', label: 'All Executives' },
    { id: 'OPERATIONS', label: 'Operations' },
    { id: 'TECHNICAL', label: 'Technical' },
    { id: 'PR', label: 'PR & Media' },
  ];

  // Filter members based on active tab
  const filteredMembers = useMemo(() => {
    if (!members || members.length === 0) return [];
    if (activeFilter === 'ALL') return members;

    return members.filter((member) => {
      const dept = (member.department || '').toUpperCase();
      const role = (member.role || '').toUpperCase();

      if (activeFilter === 'OPERATIONS') {
        return dept.includes('OP') || role.includes('OP');
      }
      if (activeFilter === 'TECHNICAL') {
        return dept.includes('TECH') || role.includes('TECH') || dept.includes('DEV') || role.includes('DEV');
      }
      if (activeFilter === 'PR') {
        return dept.includes('PR') || role.includes('PR') || dept.includes('MEDIA') || role.includes('MEDIA') || dept.includes('OUTREACH');
      }
      return true;
    });
  }, [members, activeFilter]);

  if (!members || members.length === 0) return null;

  return (
    <section className="executives-section" id="meet-the-executives">
      <div className="wrap">
        
        {/* Section Head */}
        <div className="executives-section__head">
          <span className="eyebrow executives-section__eyebrow">The Engine</span>
          <h2 className="executives-section__title">MEET THE EXECUTIVES</h2>
          <p className="executives-section__subtitle">
            The core organizers, developers, designers, and coordinators powering every flagship initiative.
          </p>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="executives-filter-bar" role="tablist" aria-label="Filter Executives by Department">
          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`executives-filter-btn ${isActive ? 'executives-filter-btn--active' : ''}`}
                onClick={() => setActiveFilter(tab.id)}
              >
                <span>{tab.label}</span>
                {isActive && (
                  <motion.div
                    className="executives-filter-pill"
                    layoutId="activeFilterPill"
                    transition={{ type: 'spring', damping: 26, stiffness: 350 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Executive Cards Grid */}
        <motion.div layout className="executives-grid">
          <AnimatePresence mode="popLayout">
            {filteredMembers.map((person, idx) => {
              const avatarFallback =
                'https://ui-avatars.com/api/?name=' +
                encodeURIComponent(person.name) +
                '&background=161d3a&color=eeb84a&size=400';

              return (
                <motion.div
                  layout
                  key={person.id || person.name || idx}
                  className="executive-card"
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  onClick={() => onSelectMember && onSelectMember(person)}
                >
                  {/* Photo Frame */}
                  <div className="executive-card__media">
                    <img
                      src={person.image || avatarFallback}
                      alt={`${person.name} — ${person.role}`}
                      className="executive-card__image"
                      loading="lazy"
                      onError={(e) => {
                        e.target.src = avatarFallback;
                      }}
                    />
                    <div className="executive-card__dept-badge">
                      {person.department || 'Executive'}
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="executive-card__body">
                    <h4 className="executive-card__name">{person.name}</h4>
                    <p className="executive-card__role">{person.role}</p>

                    <div className="executive-card__footer">
                      <MemberSocialLinks
                        linkedin={person.linkedin}
                        github={person.github}
                        memberName={person.name}
                        variant="compact"
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {filteredMembers.length === 0 && (
          <div className="executives-empty">
            <p>No executives found in this department currently.</p>
          </div>
        )}

      </div>
    </section>
  );
}
