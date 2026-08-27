import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  HiOutlineUserGroup,
  HiOutlineCpuChip,
  HiOutlineMegaphone,
  HiOutlineCog6Tooth,
  HiOutlineArrowDown,
} from 'react-icons/hi2';
import './OrganizationStructure.css';

export default function OrganizationStructure({ leadership = [], core = [] }) {
  const [activeDept, setActiveDept] = useState('ALL'); // 'ALL', 'OPERATIONS', 'TECHNICAL', 'PR'

  // Derive dynamic leadership names
  const president = useMemo(() => {
    return leadership.find(
      (m) =>
        (m.role || '').toLowerCase().includes('president') &&
        !(m.role || '').toLowerCase().includes('vice')
    );
  }, [leadership]);

  const vicePresident = useMemo(() => {
    return leadership.find((m) =>
      (m.role || '').toLowerCase().includes('vice')
    );
  }, [leadership]);

  const genSec = useMemo(() => {
    return leadership.find(
      (m) =>
        (m.role || '').toLowerCase().includes('secretary') ||
        (m.role || '').toLowerCase().includes('gensec')
    );
  }, [leadership]);

  // Derive dynamic core lead names
  const opsLead = useMemo(() => {
    return core.find(
      (m) =>
        m.department === 'Operations' ||
        (m.role || '').toLowerCase().includes('operation') ||
        (m.role || '').toLowerCase().includes('ops')
    );
  }, [core]);

  const techLead = useMemo(() => {
    return core.find(
      (m) =>
        m.department === 'Technical' ||
        (m.role || '').toLowerCase().includes('tech') ||
        (m.role || '').toLowerCase().includes('dev')
    );
  }, [core]);

  const prLead = useMemo(() => {
    return core.find(
      (m) =>
        m.department === 'PR' ||
        (m.role || '').toLowerCase().includes('pr') ||
        (m.role || '').toLowerCase().includes('media')
    );
  }, [core]);

  const departments = [
    {
      id: 'OPERATIONS',
      name: 'Operations Vertical',
      leadRole: opsLead?.role || 'Operations Lead',
      leadPerson: opsLead?.name || 'Ishan Shukla',
      icon: <HiOutlineCog6Tooth className="org-dept__icon" />,
      tagline: 'Logistics, Venue Management, Event Orchestration',
      executives: 'Operations Executives & Stage Crew',
      accentColor: '#3b82f6',
    },
    {
      id: 'TECHNICAL',
      name: 'Technical Vertical',
      leadRole: techLead?.role || 'Technical Lead',
      leadPerson: techLead?.name || 'Virat Mishra',
      icon: <HiOutlineCpuChip className="org-dept__icon" />,
      tagline: 'Web Architecture, Software Systems, Hackathons',
      executives: 'Technical Executives & Developers',
      accentColor: '#10b981',
    },
    {
      id: 'PR',
      name: 'PR & Media Vertical',
      leadRole: prLead?.role || 'PR Lead',
      leadPerson: prLead?.name || 'Sharad Agnihotri',
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
          <h2 className="org-structure__title">How Abhyudaya Works</h2>
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
            <h3 className="org-node__role">{president?.role || 'President'}</h3>
            <span className="org-node__sub">
              {president && president.name !== 'N/A'
                ? `${president.name} • Chief Executive Officer of Abhyudaya`
                : 'Chief Executive Officer of Abhyudaya'}
            </span>
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
            <h3 className="org-node__role">{vicePresident?.role || 'Vice President'}</h3>
            <span className="org-node__sub">
              {vicePresident && vicePresident.name !== 'N/A'
                ? `${vicePresident.name} • Strategic Alignment & Vertical Operations`
                : 'Strategic Alignment & Vertical Operations'}
            </span>
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
            <h3 className="org-node__role">{genSec?.role || 'General Secretary'}</h3>
            <span className="org-node__sub">
              {genSec
                ? `${genSec.name} • Central Operations & Inter-Department Coordination`
                : 'Central Operations & Inter-Department Coordination'}
            </span>
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
                    <div className="org-card__role">{dept.leadRole}</div>
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
                    <div className="org-card__exec-title">{dept.executives}</div>
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
