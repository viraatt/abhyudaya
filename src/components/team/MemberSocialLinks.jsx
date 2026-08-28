import React from 'react';
import { FaLinkedinIn, FaGithub, FaInstagram, FaGlobe } from 'react-icons/fa';
import './MemberSocialLinks.css';

/**
 * Reusable, accessible social links component.
 * Only renders icons if a valid URL exists.
 * Does NOT render placeholders or empty buttons.
 */
export default function MemberSocialLinks({
  linkedin,
  github,
  instagram,
  website,
  memberName = 'Member',
  variant = 'compact', // 'compact', 'expanded', 'minimal'
  className = '',
}) {
  const hasLinkedin = Boolean(linkedin && typeof linkedin === 'string' && linkedin.trim() !== '');
  const hasGithub = Boolean(github && typeof github === 'string' && github.trim() !== '');
  const hasInstagram = Boolean(instagram && typeof instagram === 'string' && instagram.trim() !== '');
  const hasWebsite = Boolean(website && typeof website === 'string' && website.trim() !== '');

  if (!hasLinkedin && !hasGithub && !hasInstagram && !hasWebsite) {
    return null;
  }

  return (
    <div className={`member-social-links member-social-links--${variant} ${className}`}>
      {hasLinkedin && (
        <a
          href={linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="social-btn social-btn--linkedin"
          aria-label={`Visit ${memberName}'s LinkedIn profile`}
          title={`Visit ${memberName}'s LinkedIn profile`}
          onClick={(e) => e.stopPropagation()}
        >
          <FaLinkedinIn className="social-icon" />
          {variant === 'expanded' && <span>LinkedIn</span>}
        </a>
      )}

      {hasGithub && (
        <a
          href={github}
          target="_blank"
          rel="noopener noreferrer"
          className="social-btn social-btn--github"
          aria-label={`Visit ${memberName}'s GitHub profile`}
          title={`Visit ${memberName}'s GitHub profile`}
          onClick={(e) => e.stopPropagation()}
        >
          <FaGithub className="social-icon" />
          {variant === 'expanded' && <span>GitHub</span>}
        </a>
      )}

      {hasInstagram && (
        <a
          href={instagram}
          target="_blank"
          rel="noopener noreferrer"
          className="social-btn social-btn--instagram"
          aria-label={`Visit ${memberName}'s Instagram profile`}
          title={`Visit ${memberName}'s Instagram profile`}
          onClick={(e) => e.stopPropagation()}
        >
          <FaInstagram className="social-icon" />
          {variant === 'expanded' && <span>Instagram</span>}
        </a>
      )}

      {hasWebsite && (
        <a
          href={website}
          target="_blank"
          rel="noopener noreferrer"
          className="social-btn social-btn--website"
          aria-label={`Visit ${memberName}'s website`}
          title={`Visit ${memberName}'s website`}
          onClick={(e) => e.stopPropagation()}
        >
          <FaGlobe className="social-icon" />
          {variant === 'expanded' && <span>Website</span>}
        </a>
      )}
    </div>
  );
}
