import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoClose } from 'react-icons/io5';
import MemberSocialLinks from './MemberSocialLinks';
import './ProfileModal.css';

export default function ProfileModal({ member, isOpen, onClose }) {
  const modalRef = useRef(null);

  // Close on ESC key and trap scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!member) return null;

  const avatarFallback =
    'https://ui-avatars.com/api/?name=' +
    encodeURIComponent(member.name) +
    '&background=161d3a&color=eeb84a&size=500';

  const isFaculty = member.level === 'faculty-advisor';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="profile-modal-root" role="dialog" aria-modal="true" aria-labelledby="modal-member-name">
          {/* Backdrop */}
          <motion.div
            className="profile-modal__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Modal Container */}
          <div className="profile-modal__wrapper" onClick={onClose}>
            <motion.div
              className="profile-modal__dialog"
              ref={modalRef}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                className="profile-modal__close"
                onClick={onClose}
                aria-label="Close profile modal"
              >
                <IoClose size={22} />
              </button>

              <div className="profile-modal__content">
                {/* Photo Side */}
                <div className="profile-modal__media">
                  <div className="profile-modal__image-wrapper">
                    <img
                      src={member.image || avatarFallback}
                      alt={`${member.name} — ${member.role}`}
                      className="profile-modal__image"
                      onError={(e) => {
                        e.target.src = avatarFallback;
                      }}
                    />
                  </div>
                  {member.department && (
                    <div className="profile-modal__dept-badge">
                      {member.department}
                    </div>
                  )}
                </div>

                {/* Info Side */}
                <div className="profile-modal__info">
                  <div className="profile-modal__header">
                    <span className="profile-modal__role-tag">
                      {member.role || 'Team Member'}
                    </span>
                    <h2 id="modal-member-name" className="profile-modal__name">
                      {member.name}
                    </h2>
                    {member.level === 'leadership' && (
                      <span className="profile-modal__tier-badge">The Leadership</span>
                    )}
                    {member.level === 'core' && (
                      <span className="profile-modal__tier-badge">The Core Team</span>
                    )}
                    {member.level === 'faculty-advisor' && (
                      <span className="profile-modal__tier-badge">Faculty Advisor</span>
                    )}
                  </div>

                  <div className="profile-modal__body">
                    <p className="profile-modal__bio">
                      {member.bio ||
                        `Active member of the Abhyudaya Club at Maharana Pratap Engineering College, actively contributing to technical innovation, student leadership, and university fests.`}
                    </p>
                  </div>

                  <div className="profile-modal__footer">
                    <div className="profile-modal__social-label">Connect with {member.name.split(' ')[0]}:</div>
                    <MemberSocialLinks
                      linkedin={member.linkedin}
                      github={isFaculty ? '' : member.github}
                      instagram={isFaculty ? '' : member.instagram}
                      memberName={member.name}
                      variant="expanded"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
