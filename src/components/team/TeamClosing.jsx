import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineSparkles } from 'react-icons/hi2';
import './TeamClosing.css';

export default function TeamClosing() {
  return (
    <section className="team-closing-section">
      <div className="wrap">
        <motion.div
          className="team-closing-card"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6 }}
        >
          {/* Subtle background glow */}
          <div className="team-closing-card__glow" />

          <div className="team-closing-card__eyebrow-wrap">
            <HiOutlineSparkles className="team-closing-card__sparkle" />
            <span className="eyebrow team-closing-card__eyebrow">Collective Ambition</span>
          </div>

          <h2 className="team-closing-card__title">
            <span className="team-closing-card__title-line">ONE TEAM. ONE VISION.</span>
            <span className="team-closing-card__title-accent">ABHYUDAYA&apos;26</span>
          </h2>

          <p className="team-closing-card__text">
            From classroom ideas to campus-wide technical spectacles, our team turns curiosity into creation.
            Ready to build the future with us?
          </p>

          <div className="team-closing-card__actions">
            <Link to="/join" className="btn btn--solid team-closing-card__btn">
              Join Abhyudaya
            </Link>
            <Link to="/events" className="btn btn--ghost team-closing-card__btn-ghost">
              Explore Our Events →
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
