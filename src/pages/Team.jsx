import React, { useEffect, useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { team as staticTeam } from '../data/club.js';
import { getTeamMembers } from '../Admin/pages/services/teamService.js';
import BreadcrumbSchema from '../components/seo/schemas/BreadcrumbSchema.jsx';

// Modular Subcomponents
import TeamHero from '../components/team/TeamHero.jsx';
import FacultyAdvisorSection from '../components/team/FacultyAdvisorSection.jsx';
import LeadershipSection from '../components/team/LeadershipSection.jsx';
import OrganizationStructure from '../components/team/OrganizationStructure.jsx';
import CoreTeamSection from '../components/team/CoreTeamSection.jsx';
import ExecutiveSection from '../components/team/ExecutiveSection.jsx';
import TeamClosing from '../components/team/TeamClosing.jsx';
import ProfileModal from '../components/team/ProfileModal.jsx';
import { groupTeamMembers } from '../components/team/teamUtils.js';

import './Team.css';

const SITE_URL = 'https://www.abhyudayaclub.in';

export default function Team() {
  const [dbMembers, setDbMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);

  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Team', url: `${SITE_URL}/team` },
  ];

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const data = await getTeamMembers();
        if (isMounted && Array.isArray(data)) {
          setDbMembers(data);
        }
      } catch (err) {
        console.error('Error loading team members from Firestore:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Process and group team data
  const {
    faculty,
    mainLeadership,
    verticalLeads,
    core,
    executives,
    associates
  } = useMemo(() => {
    let rawFaculty = [];
    let rawLeadership = [];
    let rawCore = [];
    let rawExecutives = [];
    let rawAssociates = [];

    if (dbMembers.length > 0) {
      const grouped = groupTeamMembers(dbMembers);
      rawFaculty = grouped.faculty || [];
      rawLeadership = grouped.leadership || [];
      rawCore = grouped.core || [];
      rawExecutives = grouped.executives || [];
      rawAssociates = grouped.associates || [];
    } else {
      rawFaculty = staticTeam.faculty || [];
      rawLeadership = staticTeam.leadership || [];
      rawCore = staticTeam.core || [];
      rawExecutives = staticTeam.executives || [];
      rawAssociates = staticTeam.associates || staticTeam.associateExecutives || [];
    }

    // Filter vertical leads ("Technical Lead", "Operations Lead", "PR Lead") from main student leadership
    const mainL = rawLeadership.filter(
      (m) => !m.role.toLowerCase().includes('lead')
    );
    const vertL = rawLeadership.filter(
      (m) => m.role.toLowerCase().includes('lead')
    );

    return {
      faculty: rawFaculty,
      mainLeadership: mainL,
      verticalLeads: vertL,
      core: rawCore,
      executives: rawExecutives,
      associates: rawAssociates
    };
  }, [dbMembers]);

  const primaryAdvisor = faculty?.[0] || null;

  return (
    <div className="team-page-wrapper team-page-centered">
      <Helmet>
        <title>Our Team 2026 | Abhyudaya Club — Faculty &amp; Student Leaders at MPEC Kanpur</title>
        <meta
          name="description"
          content="Meet the Abhyudaya Club 2026 team — dedicated faculty advisor, student leadership, core team, and executives at MPEC Kanpur."
        />
        <link rel="canonical" href={`${SITE_URL}/team`} />
        <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1" />
        <meta property="og:title" content="Our Team 2026 | Abhyudaya Club — MPEC Kanpur" />
        <meta property="og:description" content="Meet the faculty advisor, student leaders, executives, and associate executives of Abhyudaya Club at MPEC Kanpur." />
        <meta property="og:url" content={`${SITE_URL}/team`} />
        <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
        <meta property="og:locale" content="en_IN" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Our Team 2026 | Abhyudaya Club" />
        <meta name="twitter:description" content="Meet the faculty advisor and student leaders of Abhyudaya Club at MPEC Kanpur." />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.png`} />
      </Helmet>

      <BreadcrumbSchema items={breadcrumbItems} />

      {/* 1. HERO */}
      <TeamHero />

      {loading ? (
        <section className="section team-loading">
          <div className="wrap">
            <p>Loading team members...</p>
          </div>
        </section>
      ) : (
        <>
          {/* 2. FACULTY COORDINATOR */}
          {primaryAdvisor && (
            <FacultyAdvisorSection
              advisor={primaryAdvisor}
              onSelectMember={setSelectedMember}
            />
          )}

          {/* 3. STUDENT LEADERSHIP (President, VP, etc. - Styled on Dark BG) */}
          {mainLeadership.length > 0 && (
            <div className="section-theme-wrapper section--dark">
              <LeadershipSection
                title="Student Leadership"
                eyebrow="Executive Officers"
                members={mainLeadership}
                onSelectMember={setSelectedMember}
              />
            </div>
          )}

          {/* 4. DOMAIN & VERTICAL LEADS (Tech, Ops, PR Leads - Directly below Leadership on Dark BG) */}
          {verticalLeads.length > 0 && (
            <div className="section-theme-wrapper section--dark section-border-top">
              <LeadershipSection
                title="Domain &amp; Vertical Leads"
                eyebrow="Functional Directors"
                members={verticalLeads}
                onSelectMember={setSelectedMember}
              />
            </div>
          )}

          {/* 5. CORE TEAM (Domain Leadership & Core Leads on Warm Cream BG) */}
          {core.length > 0 && (
            <CoreTeamSection
              members={core}
              onSelectMember={setSelectedMember}
            />
          )}

          {/* 6. HOW ABHYUDAYA WORKS (Interactive Organizational Flow) */}
          <OrganizationStructure
            leadership={mainLeadership}
            core={core}
          />

          {/* 7. EXECUTIVE COMMITTEE */}
          {executives.length > 0 && (
            <ExecutiveSection
              title="Executive Committee"
              eyebrow="Executives"
              members={executives}
              onSelectMember={setSelectedMember}
            />
          )}

          {/* 8. ASSOCIATE EXECUTIVES (Centered grid) */}
          {associates.length > 0 && (
            <div className="section-theme-wrapper section--dark">
              <ExecutiveSection
                title="Associate Executives"
                eyebrow="Support Team"
                members={associates}
                onSelectMember={setSelectedMember}
              />
            </div>
          )}

          {/* 9. CLOSING CALL TO ACTION */}
          <TeamClosing />
        </>
      )}

      {/* MODAL DETAILED POPUP */}
      <ProfileModal
        member={selectedMember}
        isOpen={Boolean(selectedMember)}
        onClose={() => setSelectedMember(null)}
      />
    </div>
  );
}