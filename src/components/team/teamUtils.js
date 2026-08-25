/**
 * Helper utilities for classifying and normalizing Abhyudaya Team Members.
 * Ensures consistent structure between Static data and Firestore documents.
 */

export const DEPARTMENTS = {
  ALL: "ALL",
  OPERATIONS: "OPERATIONS",
  TECHNICAL: "TECHNICAL",
  PR: "PR",
};

/**
 * Normalizes member category, level, and department from either static data or Firestore docs.
 */
export function normalizeMember(member, index = 0) {
  const role = (member.role || "").trim();
  const lowerRole = role.toLowerCase();
  const lowerCategory = (member.category || "").toLowerCase();
  const explicitDept = member.department || "";

  let level = member.level || "executive";
  let department = explicitDept;

  // 1. Faculty Advisor Detection
  if (
    lowerRole.includes("faculty") ||
    lowerRole.includes("advisor") ||
    lowerCategory.includes("faculty")
  ) {
    level = "faculty-advisor";
    department = explicitDept || "Faculty Advisory";
  }
  // 2. Leadership Detection (President, Vice President, General Secretary)
  else if (
    lowerRole.includes("president") ||
    lowerRole.includes("general secretary") ||
    lowerRole.includes("gen sec") ||
    lowerCategory.includes("executive board") ||
    lowerCategory.includes("leadership")
  ) {
    // If not a domain lead
    if (!lowerRole.includes("lead") || lowerRole.includes("president")) {
      level = "leadership";
      department = explicitDept || "Leadership";
    }
  }

  // 3. Domain Leads / Core Detection
  if (
    lowerRole.includes("lead") ||
    lowerCategory.includes("domain lead") ||
    lowerCategory.includes("core lead")
  ) {
    level = "core";
    if (lowerRole.includes("operation") || lowerRole.includes("ops")) {
      department = "Operations";
    } else if (lowerRole.includes("tech") || lowerRole.includes("code") || lowerRole.includes("web")) {
      department = "Technical";
    } else if (lowerRole.includes("pr") || lowerRole.includes("public") || lowerRole.includes("media") || lowerRole.includes("outreach")) {
      department = "PR";
    }
  }

  // 4. Department fallback detection if not set
  if (!department || department === "Leadership" || department === "Faculty Advisory") {
    if (level === "core" || level === "executive") {
      if (lowerRole.includes("operation") || lowerRole.includes("ops")) {
        department = "Operations";
      } else if (lowerRole.includes("tech") || lowerRole.includes("code") || lowerRole.includes("dev")) {
        department = "Technical";
      } else if (lowerRole.includes("pr") || lowerRole.includes("public") || lowerRole.includes("media") || lowerRole.includes("design")) {
        department = "PR";
      } else {
        // distribute default executive assignments consistently
        const defaultDepts = ["Technical", "Operations", "PR"];
        department = defaultDepts[index % defaultDepts.length];
      }
    }
  }

  return {
    id: member.id || `member-${member.name}-${index}`,
    name: member.name || "Abhyudaya Member",
    role: role || "Team Member",
    department: department || "Operations",
    level: member.level || level,
    image: member.image || "",
    linkedin: (member.linkedin || "").trim(),
    github: (member.github || "").trim(),
    bio: member.bio || "",
    order: member.order !== undefined ? Number(member.order) : index + 1,
  };
}

/**
 * Groups a flat array of members (from Firestore or static) into hierarchical tiers.
 */
export function groupTeamMembers(members = []) {
  const normalized = members.map((m, idx) => normalizeMember(m, idx));

  const faculty = normalized.filter((m) => m.level === "faculty-advisor");
  const leadership = normalized.filter((m) => m.level === "leadership");
  const core = normalized.filter((m) => m.level === "core");
  const executives = normalized.filter((m) => m.level === "executive");

  return {
    faculty,
    leadership,
    core,
    executives,
  };
}
