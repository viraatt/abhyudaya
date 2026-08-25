import React from 'react';
import { motion } from 'framer-motion';
import './TeamHero.css';

export default function TeamHero() {
  return (
    <section className="team-hero">
      <div className="wrap">
        <div className="team-hero__inner">
          
          {/* Eyebrow Badge */}
          <motion.div
            className="team-hero__badge"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="team-hero__badge-dot" />
            <span className="team-hero__badge-text">TEAM / 2026</span>
          </motion.div>

          {/* Editorial Headline */}
          <motion.h1
            className="team-hero__title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <span className="team-hero__title-line">THE PEOPLE</span>
            <span className="team-hero__title-line team-hero__title-accent">
              BEHIND ABHYUDAYA
            </span>
          </motion.h1>

          {/* Supporting Manifesto Subtitle */}
          <motion.p
            className="team-hero__tagline"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Different minds. One vision.
          </motion.p>

          {/* Editorial Narrative Statement */}
          <motion.p
            className="team-hero__lede"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            The dedicated educators and student pioneers cultivating innovation, 
            technical prowess, and leadership at Maharana Pratap Engineering College.
          </motion.p>

        </div>
      </div>

      {/* Horizon subtle accent line */}
      <div className="team-hero__horizon" />
    </section>
  );
}
