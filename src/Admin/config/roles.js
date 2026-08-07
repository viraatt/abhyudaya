export const ROLES = {
  SUPER_ADMIN: "super_admin",
  BLOG_ADMIN: "blog_admin",
  EVENT_ADMIN: "event_admin",
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
  },

  [ROLES.BLOG_ADMIN]: {
    dashboard: false,
    blogs: true,
    events: false,
    media: true,
    users: false,
    team: false,
    gallery: false,
    contact: false,
    reviews: false,
  },

  [ROLES.EVENT_ADMIN]: {
    dashboard: false,
    blogs: false,
    events: true,
    media: true,
    users: false,
    team: false,
    gallery: false,
    contact: false,
    reviews: false,
  },
};