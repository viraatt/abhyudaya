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
    media: true,
    users: false,
    team: false,
    gallery: true,
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