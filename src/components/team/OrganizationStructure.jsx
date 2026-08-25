import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  HiOutlineUserGroup,
  HiOutlineCpuChip,
  HiOutlineMegaphone,
  HiOutlineCog6Tooth,
  HiOutlineArrowDown,
} from 'react-icons/hi2';
import './OrganizationStructure.css';

export default function OrganizationStructure() {
  const [activeDept, setActiveDept] = useState('ALL'); // 'ALL', 'OPERATIONS', 'TECHNICAL', 'PR'

  const departments = [
    {
      id: 'OPERATIONS',
      name: 'Operations Vertical',
      leadRole: 'Operations Lead',
      leadPerson: 'Ishan Shukla',
      icon: <HiOutlineCog6Tooth className="org-dept__icon" />,
      tagline: 'Logistics, Venue Management, Event Orchestration',
      executives: 'Operations Executives & Stage Crew',
      accentColor: '#3b82f6',
    },
    {
      id: 'TECHNICAL',
      name: 'Technical Vertical',
      leadRole: 'Technical Lead',
      leadPerson: 'Virat Mishra',
      icon: <HiOutlineCpuChip className="org-dept__icon" />,
      tagline: 'Web Architecture, Software Systems, Hackathons',
      executives: 'Technical Executives & Developers',
      accentColor: '#10b981',
    },
    {
      id: 'PR',
      name: 'PR & Media Vertical',
      leadRole: 'PR Lead',
      leadPerson: 'Sharad Agnihotri',
      icon: <HiOutlineMegaphone className="org-dept__icon" />,
      tagline: 'Brand Outreach, Creative Media, Public Relations',
      executives: 'PR Executives & Media Crew',
      accentColor: '#f59e0b',
    },
  ];

  return (
    <section className="org-structure-section" id="how-abhyudaya-works">
      <div className="wrap">
        
        {/* Section Header */}
        <div className="org-structure__head">
          <div className="org-structure__eyebrow-wrap">
            <HiOutlineUserGroup className="org-structure__head-icon" />
            <span className="eyebrow">Organizational Architecture</span>
          </div>
          <h2 className="org-structure__title">HOW ABHYUDAYA WORKS</h2>
          <p className="org-structure__subtitle">
            An agile, student-driven governance pipeline designed for seamless execution, rapid innovation, and cross-vertical synergy.
          </p>
        </div>

        {/* Tree Container */}
        <div className="org-tree">
          
          {/* 1. PRESIDENT NODE */}
          <motion.div
            className="org-node org-node--president"
            initial={{ opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
          >
            <div className="org-node__badge">Top Governance</div>
            <h4 className="org-node__role">PRESIDENT</h4>
            <span className="org-node__sub">Chief Executive Officer of Abhyudaya</span>
          </motion.div>

          {/* Connector Line 1 */}
          <div className="org-line org-line--vertical">
            <span className="org-line__glow-dot" />
          </div>

          {/* 2. VICE PRESIDENT NODE */}
          <motion.div
            className="org-node org-node--vp"
            initial={{ opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.1 }}
          >
            <div className="org-node__badge">Executive Leadership</div>
            <h4 className="org-node__role">VICE PRESIDENT</h4>
            <span className="org-node__sub">Strategic Alignment &amp; Vertical Operations</span>
          </motion.div>

          {/* Connector Line 2 */}
          <div className="org-line org-line--vertical">
            <span className="org-line__glow-dot" />
          </div>

          {/* 3. GENERAL SECRETARY NODE */}
          <motion.div
            className="org-node org-node--gensec"
            initial={{ opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.2 }}
          >
            <div className="org-node__badge">Executive Synchrony</div>
            <h4 className="org-node__role">GENERAL SECRETARY</h4>
            <span className="org-node__sub">Unnati Pal • Central Operations &amp; Inter-Department Coordination</span>
          </motion.div>

          {/* Branching Connector Splitter */}
          <div className="org-branch-container">
            <div className="org-line org-line--stem" />
            <div className="org-line org-line--horizontal" />
          </div>

          {/* 4. THREE DOMAIN PILLARS (OPERATIONS | TECHNICAL | PR) */}
          <div className="org-departments-row">
            {departments.map((dept, index) => {
              const isSelected = activeDept === 'ALL' || activeDept === dept.id;

              return (
                <motion.div
                  key={dept.id}
                  className={`org-dept-col ${isSelected ? 'org-dept-col--active' : ''}`}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: 0.25 + index * 0.1 }}
                  onMouseEnter={() => setActiveDept(dept.id)}
                  onMouseLeave={() => setActiveDept('ALL')}
                >
                  {/* Vertical branch line leading to lead */}
                  <div className="org-line org-line--dept-drop">
                    <span className="org-line__glow-dot" />
                  </div>

                  {/* Lead Card */}
                  <div className="org-card org-card--lead">
                    <div className="org-card__header">
                      {dept.icon}
                      <span className="org-card__dept-name">{dept.name}</span>
                    </div>
                    <h5 className="org-card__role">{dept.leadRole}</h5>
                    <div className="org-card__person">{dept.leadPerson}</div>
                    <p className="org-card__tagline">{dept.tagline}</p>
                  </div>

                  {/* Down Arrow Connector */}
                  <div className="org-arrow-connector">
                    <HiOutlineArrowDown className="org-arrow-icon" />
                  </div>

                  {/* Executives Node */}
                  <div className="org-card org-card--execs">
                    <span className="org-card__exec-label">Department Execution</span>
                    <h6 className="org-card__exec-title">{dept.executives}</h6>
                    <span className="org-card__exec-note">Field Execution &amp; Support Crew</span>
                  </div>
                </motion.div>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
}
