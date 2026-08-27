/**
 * Helper utilities for classifying and normalizing Abhyudaya Team Members.
 * Ensures consistent structure between Static data and Firestore documents.
 *
 * This file is the single shared "team domain" module consumed by:
 *  - The public /team page (grouping + normalization)
 *  - The Admin Team form (controlled vocab for level/department/role)
 */

// ------------------------------------------------------------------
// Controlled vocabulary (single source of truth for level/department)
// ------------------------------------------------------------------

export const LEVELS = {
  FACULTY_ADVISOR: "faculty-advisor",
  LEADERSHIP: "leadership",
  CORE: "core",
  EXECUTIVE: "executive",
};

export const VALID_LEVELS = Object.values(LEVELS);

export const LEVEL_LABELS = {
  [LEVELS.FACULTY_ADVISOR]: "Faculty Advisor",
  [LEVELS.LEADERSHIP]: "The Leadership",
  [LEVELS.CORE]: "Core Team",
  [LEVELS.EXECUTIVE]: "Executive",
};

// Canonical department labels used consistently by Admin + Public.
export const DEPARTMENT_OPTIONS = [
  "Leadership",
  "Operations",
  "Technical",
  "PR",
  "Faculty Advisory",
];

// Departments an Executive / Core member can belong to.
export const EXECUTIVE_DEPARTMENTS = ["Operations", "Technical", "PR"];

export const DEPARTMENTS = {
  ALL: "ALL",
  OPERATIONS: "OPERATIONS",
  TECHNICAL: "TECHNICAL",
  PR: "PR",
};

// Fixed role presets an admin can pick for Faculty / Leadership / Core.
// Selecting one of these auto-locks level + department.
export const ROLE_PRESETS = [
  {
    label: "Faculty Advisor",
    value: "Faculty Advisor",
    level: LEVELS.FACULTY_ADVISOR,
    department: "Faculty Advisory",
    category: "Faculty Co-ordinators",
  },
  {
    label: "President (Leadership)",
    value: "President",
    level: LEVELS.LEADERSHIP,
    department: "Leadership",
    category: "Executive Board",
  },
  {
    label: "Vice President (Leadership)",
    value: "Vice President",
    level: LEVELS.LEADERSHIP,
    department: "Leadership",
    category: "Executive Board",
  },
  {
    label: "General Secretary (Leadership)",
    value: "General Secretary",
    level: LEVELS.LEADERSHIP,
    department: "Leadership",
    category: "Executive Board",
  },
  {
    label: "Operations Lead (Core)",
    value: "Operations Lead",
    level: LEVELS.CORE,
    department: "Operations",
    category: "Core Team",
  },
  {
    label: "Technical Lead (Core)",
    value: "Technical Lead",
    level: LEVELS.CORE,
    department: "Technical",
    category: "Core Team",
  },
  {
    label: "PR Lead (Core)",
    value: "PR Lead",
    level: LEVELS.CORE,
    department: "PR",
    category: "Core Team",
  },
  {
    label: "Operations Executive (Executive)",
    value: "Operations Executive",
    level: LEVELS.EXECUTIVE,
    department: "Operations",
    category: "Domain Leads",
  },
  {
    label: "Technical Executive (Executive)",
    value: "Technical Executive",
    level: LEVELS.EXECUTIVE,
    department: "Technical",
    category: "Domain Leads",
  },
  {
    label: "PR Executive (Executive)",
    value: "PR Executive",
    level: LEVELS.EXECUTIVE,
    department: "PR",
    category: "Domain Leads",
  },
];

// Legacy `category` field mapping, kept for backward compatibility with
// any existing document/reader relying on it.
export const CATEGORY_BY_LEVEL = {
  [LEVELS.FACULTY_ADVISOR]: "Faculty Co-ordinators",
  [LEVELS.LEADERSHIP]: "Executive Board",
  [LEVELS.CORE]: "Core Team",
  [LEVELS.EXECUTIVE]: "Domain Leads",
};

/**
 * Validates an optional URL field (LinkedIn / GitHub).
 * Empty string / undefined is considered valid (field is optional).
 */
export function isValidUrl(value) {
  if (!value || typeof value !== "string" || value.trim() === "") return true;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

const KNOWN_DEPARTMENTS = DEPARTMENT_OPTIONS;

/**
 * Normalizes member category, level, and department from either static data or Firestore docs.
 * Explicit `level`/`department` values written by Admin form always take precedence.
 */
export function normalizeMember(member, index = 0) {
  const role = (member.role || "").trim();
  const lowerRole = role.toLowerCase();
  const lowerCategory = (member.category || "").toLowerCase();
  const explicitDept = (member.department || "").trim();
  const hasExplicitDept = KNOWN_DEPARTMENTS.includes(explicitDept);
  const hasExplicitLevel = VALID_LEVELS.includes(member.level);

  let level = hasExplicitLevel ? member.level : LEVELS.EXECUTIVE;
  let department = explicitDept;

  // Legacy inference — only runs when the document has no controlled `level`.
  if (!hasExplicitLevel) {
    if (
      lowerRole.includes("faculty") ||
      lowerRole.includes("advisor") ||
      lowerCategory.includes("faculty")
    ) {
      level = LEVELS.FACULTY_ADVISOR;
    } else if (
      lowerRole.includes("president") ||
      lowerRole.includes("general secretary") ||
      lowerRole.includes("gen sec") ||
      lowerCategory.includes("executive board") ||
      lowerCategory.includes("leadership")
    ) {
      if (!lowerRole.includes("lead") || lowerRole.includes("president")) {
        level = LEVELS.LEADERSHIP;
      }
    }

    if (
      lowerRole.includes("lead") ||
      lowerCategory.includes("domain lead") ||
      lowerCategory.includes("core lead")
    ) {
      level = LEVELS.CORE;
    }
  }

  // Department inference — only runs when no trusted explicit department is set.
  if (!hasExplicitDept) {
    if (level === LEVELS.FACULTY_ADVISOR) {
      department = "Faculty Advisory";
    } else if (level === LEVELS.LEADERSHIP) {
      department = "Leadership";
    } else if (level === LEVELS.CORE || level === LEVELS.EXECUTIVE) {
      if (lowerRole.includes("operation") || lowerRole.includes("ops")) {
        department = "Operations";
      } else if (
        lowerRole.includes("tech") ||
        lowerRole.includes("code") ||
        lowerRole.includes("dev") ||
        lowerRole.includes("web")
      ) {
        department = "Technical";
      } else if (
        lowerRole.includes("pr") ||
        lowerRole.includes("public") ||
        lowerRole.includes("media") ||
        lowerRole.includes("outreach") ||
        lowerRole.includes("design")
      ) {
        department = "PR";
      } else {
        const defaultDepts = ["Technical", "Operations", "PR"];
        department = defaultDepts[index % defaultDepts.length];
      }
    }
  }

  // Active flag: defaults to true so legacy documents without this field
  // remain visible on the public site.
  const active = member.active === false ? false : true;

  return {
    id: member.id || `member-${member.name}-${index}`,
    name: member.name || "Abhyudaya Member",
    role: role || "Team Member",
    department: department || "Operations",
    level,
    image: member.image || "",
    linkedin: (member.linkedin || "").trim(),
    github: (member.github || "").trim(),
    bio: member.bio || "",
    order:
      member.order !== undefined && member.order !== null && member.order !== ""
        ? Number(member.order)
        : index + 1,
    active,
    category: member.category || CATEGORY_BY_LEVEL[level] || "Executive Board",
  };
}

/**
 * Groups a flat array of members (from Firestore or static) into hierarchical tiers.
 * Only members with `active !== false` are included — deactivated members are
 * preserved in Firestore but excluded from the public site.
 */
export function groupTeamMembers(members = []) {
  const normalized = members
    .map((m, idx) => normalizeMember(m, idx))
    .filter((m) => m.active !== false);

  const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);

  const faculty = normalized
    .filter((m) => m.level === LEVELS.FACULTY_ADVISOR)
    .sort(byOrder);
  const leadership = normalized
    .filter((m) => m.level === LEVELS.LEADERSHIP)
    .sort(byOrder);
  const core = normalized
    .filter((m) => m.level === LEVELS.CORE)
    .sort(byOrder);
  const executives = normalized
    .filter((m) => m.level === LEVELS.EXECUTIVE)
    .sort(byOrder);

  return {
    faculty,
    leadership,
    core,
    executives,
  };
}
