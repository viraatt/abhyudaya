export const ROLES = {
  SUPER_ADMIN: "super_admin",
  BLOG_ADMIN: "blog_admin",
  EVENT_ADMIN: "event_admin",
};

// Default landing page for each admin role.
// Used by ProtectedRoute when an authenticated user is redirected
// because they don't have access to the requested route.
export const ROLE_HOME = {
  [ROLES.SUPER_ADMIN]: "/admin/dashboard",
  [ROLES.BLOG_ADMIN]: "/admin/blogs",
  [ROLES.EVENT_ADMIN]: "/admin/events",
};

export const PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: {
    dashboard: true,
    blogs: true,
    events: true,
    media: true,
    users: true,
    team: true,
    gallery: true,
    contact: true,
    reviews: true,
    timeCapsules: true,
  },

  [ROLES.BLOG_ADMIN]: {
    dashboard: false,
    blogs: true,
    events: false,
    media: false,
    users: false,
    team: false,
    gallery: false,
    contact: false,
    reviews: false,
    timeCapsules: false,
  },

  [ROLES.EVENT_ADMIN]: {
    dashboard: false,
    blogs: false,
    events: true,
    media: true,
    users: false,
    team: false,
    gallery: true,
    contact: false,
    reviews: false,
    timeCapsules: true,
  },
};

/**
 * Normalizes role string variations into canonical role identifiers.
 * e.g. "superadmin", "super_admin", "admin" -> "super_admin"
 *      "blogadmin", "blog_admin", "Blog Admin" -> "blog_admin"
 *      "eventadmin", "event_admin", "Event Admin" -> "event_admin"
 */
export const normalizeRole = (role) => {
  if (!role || typeof role !== "string") return null;
  const clean = role.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (clean === "superadmin" || clean === "super_admin" || clean === "admin") {
    return ROLES.SUPER_ADMIN;
  }
  if (clean === "blogadmin" || clean === "blog_admin") {
    return ROLES.BLOG_ADMIN;
  }
  if (clean === "eventadmin" || clean === "event_admin") {
    return ROLES.EVENT_ADMIN;
  }
  return clean;
};

export const isBlogAdmin = (role) => normalizeRole(role) === ROLES.BLOG_ADMIN;
export const isSuperAdmin = (role) => normalizeRole(role) === ROLES.SUPER_ADMIN;