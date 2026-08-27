import React, { useEffect, useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { team as staticTeam } from '../data/club.js';
import { getTeamMembers } from '../Admin/pages/services/teamService.js';
import BreadcrumbSchema from '../components/seo/schemas/BreadcrumbSchema.jsx';

// Modular Team Subcomponents
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
    async function loadData() {
      try {
        const data = await getTeamMembers();
        if (Array.isArray(data) && data.length > 0) {
          setDbMembers(data);
        }
      } catch (err) {
        console.error('Error loading team members from Firestore:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Process data from Firestore if available, otherwise use enhanced static fallback
  const groupedData = useMemo(() => {
    if (dbMembers.length > 0) {
      return groupTeamMembers(dbMembers);
    }

    return {
      faculty: staticTeam.faculty || [],
      leadership: staticTeam.leadership || [],
      core: staticTeam.core || [],
      executives: staticTeam.executives || [],
    };
  }, [dbMembers]);

  const primaryAdvisor = groupedData.faculty[0] || (staticTeam.faculty && staticTeam.faculty[0]);

  return (
    <div className="team-page-wrapper">
      <Helmet>
        <title>Our Team 2026 | Abhyudaya Club — Faculty &amp; Student Leaders at MPEC Kanpur</title>
        <meta
          name="description"
          content="Meet the Abhyudaya Club 2026 team — dedicated faculty advisor and passionate student leaders across Operations, Technical, and PR verticals at MPEC Kanpur."
        />
        <link rel="canonical" href={`${SITE_URL}/team`} />
        <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1" />

        <meta property="og:title" content="Our Team 2026 | Abhyudaya Club — MPEC Kanpur" />
        <meta
          property="og:description"
          content="Meet the visionary faculty advisor and dynamic student leaders of Abhyudaya Club at MPEC Kanpur."
        />
        <meta property="og:url" content={`${SITE_URL}/team`} />
        <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
        <meta property="og:locale" content="en_IN" />
        <meta property="og:type" content="website" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Our Team 2026 | Abhyudaya Club" />
        <meta
          name="twitter:description"
          content="Meet the faculty advisor and student leaders of Abhyudaya Club at MPEC Kanpur."
        />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.png`} />
      </Helmet>

      <BreadcrumbSchema items={breadcrumbItems} />

      {/* 1. HERO — TEAM / 2026 */}
      <TeamHero />

      {/* 2. FACULTY ADVISOR */}
      <FacultyAdvisorSection
        advisor={primaryAdvisor}
        onSelectMember={setSelectedMember}
      />

      {/* 3. THE LEADERSHIP */}
      <LeadershipSection
        members={groupedData.leadership}
        onSelectMember={setSelectedMember}
      />

      {/* 4. HOW ABHYUDAYA WORKS (Interactive Organizational Flow) */}
      <OrganizationStructure
        leadership={groupedData.leadership}
        core={groupedData.core}
      />

      {/* 5. THE CORE TEAM */}
      <CoreTeamSection
        members={groupedData.core}
        onSelectMember={setSelectedMember}
      />

      {/* 6. MEET THE EXECUTIVES (ALL | OPERATIONS | TECHNICAL | PR) */}
      <ExecutiveSection
        members={groupedData.executives}
        onSelectMember={setSelectedMember}
      />

      {/* 7. ONE TEAM. ONE VISION. ABHYUDAYA'26 */}
      <TeamClosing />

      {/* PROFILE MODAL DIALOG */}
      <ProfileModal
        member={selectedMember}
        isOpen={Boolean(selectedMember)}
        onClose={() => setSelectedMember(null)}
      />
    </div>
  );
}
