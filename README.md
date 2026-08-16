# Abhyudaya Club — Website

## TL;DR

A single-page React + Vite app for the Abhyudaya Club (MPEC Kanpur, Dept. of
Basic Sciences & Humanities) with two halves:

- **Public site** — brochure pages (home, about, events, team, gallery, blog,
  contact, join, announcements, event registration, certificate
  portal/verification).
- **Admin dashboard** — role-based (`super_admin`, `blog_admin`,
  `event_admin`) content management for events, blogs, users, media, team,
  gallery, reviews, announcements, students, registrations, and certificates.

Data lives in **Firestore**, auth via **Firebase Auth**, media via
**Cloudinary**. Built for **Netlify/Vercel/Firebase** deployment, with
auto-generated sitemaps/RSS and Puppeteer-based prerendering for SEO.

```bash
npm install && npm run dev   # local dev
npm run build                # production build (also builds sitemaps)
```

Two files are required locally but never committed: `.env` and
`firebase-service-account.json` (see [Secrets & security](#secrets--security)).

---

Public website + private admin dashboard for the **Abhyudaya Club** (MPEC
Kanpur, Department of Basic Sciences & Humanities).

It is a single-page React app (built with Vite) that ships a public brochure
site alongside a role-based admin panel for managing content. Content is
stored in **Firestore** (with Firebase Auth for admin login and Cloud Storage
for media), so most pages are data-driven rather than hand-coded.

---

## Tech stack

| Layer       | Choice                                                                 |
| ----------- | ---------------------------------------------------------------------- |
| Framework   | React 18 + Vite 7, JSX                                                  |
| Routing     | react-router (public + admin routes in one tree)                        |
| Styling     | Plain CSS (`tokens.css` + `shared.css`), Tailwind v4, some framer-motion |
| Backend     | Firebase (Auth, Firestore, Storage) + Cloudinary (image/PDF uploads)    |
| Editor      | TipTap rich-text editor (blogs + events)                                |
| SEO         | react-helmet-async + JSON-LD schemas, prerendering + dynamic sitemaps   |
| Deploy      | Configured for Netlify, Vercel, and Firebase (see below)                |

---

## Getting started

```bash
npm install      # install dependencies
npm run dev      # local dev server (http://localhost:5173)
npm run build    # production build -> dist/ (+ generates sitemaps/feeds)
npm run preview  # preview the production build
npm run lint     # ESLint (zero warnings allowed)
```

> **Note:** the build also runs `scripts/generate-sitemap.js` automatically.
> That script only pulls live Firestore content if
> `firebase-service-account.json` is present in the project root (it is
> **gitignored** — see "Secrets handling" below). Without it, sitemaps still
> build from the static route list.

---

## Project structure

```
.
├── api/gallery.js               # serverless API: Cloudinary gallery listing
├── public/                      # served as-is at the site root
│   ├── videos/hero-bg.mp4       #   hero background video
│   ├── feed.xml                 #   RSS feed (generated at build)
│   ├── sitemap*.xml             #   sitemaps (generated at build)
│   ├── robots.txt, humans.txt, site.webmanifest, og-image.png
│   ├── _redirects               #   SPA fallback (Netlify)
│   └── .well-known/security.txt
├── scripts/
│   ├── generate-sitemap.js      # builds sitemap/news/image/rss from Firestore
│   └── prerender.js             # pre-renders routes to static HTML for SEO
├── src/
│   ├── main.jsx                 # app entry (BrowserRouter + AuthProvider + styles)
│   ├── App.jsx                  # ALL routes (public + admin) + code-splitting
│   ├── assets/                  # logo images, blog cover images
│   ├── styles/                  # design tokens & shared component classes
│   ├── data/                    # static content (nav, categories, club info)
│   ├── context/AuthContext.jsx  # Firebase auth state + page redirects
│   ├── Firebase/              # Firebase client setup + feature services
│   │   ├── firebase.js           #   app init (auth, db, storage)
│   │   └── *Service.js           #   per-feature Firestore read/write helpers
│   ├── services/               # non-Firebase API helpers (Cloudinary gallery)
│   ├── utils/                  # shared helpers (slug, CSV, registration status)
│   ├── components/             # shared/public UI components
│   │   ├── blog/                #   blog cards, grid, filters, skeleton, etc.
│   │   ├── gallery/             #   gallery tile components
│   │   ├── reviews/            #   review form, cards, rating, summary
│   │   ├── seo/                 #   SEO wrapper + JSON-LD schema components
│   │   └── ui/                  #   decorative/3D card components
│   ├── pages/                  # public pages (Home, About, Events, Blog...)
│   │   ├── Certificate/         #   certificate upload portal
│   │   └── VerifyCertificate/   #   certificate verification
│   └── Admin/                  # admin dashboard (private)
│       ├── components/          #   editor, media library, forms, toasts
│       ├── config/roles.js      #   role definitions + permissions
│       ├── hooks/useAutosave.js
│       └── pages/               #   each admin screen + sub-components
├── firebase.json                # Firestore config (rules + indexes)
├── firestore.rules              # Firestore security rules
├── firestore.indexes.json       # Firestore composite indexes
├── vite.config.js               # Vite + Tailwind + code-splitting config
├── vercel.json, netlify.toml    # SPA-fallback deployment config
├── .github/workflows/           # CI (daily Netlify rebuild for fresh sitemaps)
├── .eslintrc.cjs
└── index.html                   # Vite HTML entry
```

> Two files are intentionally **not** in the repo: `.env` (environment
> secrets) and `firebase-service-account.json` (server credentials). Both are
> gitignored. See [Secrets](#secrets--security) below.

---

## Routes

All routes are defined (and code-split via `React.lazy`) in **`src/App.jsx`**.

### Public routes (wrapped in `<Layout>`)

| Path                       | Page                        |
| -------------------------- | --------------------------- |
| `/`                        | Home                        |
| `/about`                   | About                       |
| `/events`                  | Events list                 |
| `/events/:slug`            | Single event details        |
| `/team`                    | Team                        |
| `/gallery`                 | Gallery (Cloudinary-backed) |
| `/blog`                    | Blog list                   |
| `/blog/:slug`              | Single blog post            |
| `/contact`                 | Contact                     |
| `/join`                    | Join the club               |
| `/announcements`           | Announcements               |
| `/register/:eventId`       | Event registration form     |
| `/certificate`             | Certificate portal          |
| `/verify/:certificateId`   | Certificate verification    |
| `*`                        | 404 (`NotFound`)            |

### Admin routes

Admin routes are protected by `ProtectedRoute`, which checks Firebase auth
and then the user's role from the Firestore `users/{uid}` document.

| Path                           | Page              | Roles                          |
| ------------------------------ | ----------------- | ------------------------------ |
| `/admin/login`                 | Login             | —                              |
| `/admin/dashboard`             | Dashboard stats   | `super_admin`                  |
| `/admin/events` (+ add/edit)   | Event manager     | `super_admin`, `event_admin`   |
| `/admin/users`                 | Users             | `super_admin`                  |
| `/admin/blogs` (+ add/edit)    | Blog manager      | `super_admin`, `blog_admin`    |
| `/admin/media`                | Media library     | all three roles                |
| `/admin/team`                 | Team mgmt         | `super_admin`                  |
| `/admin/gallery`               | Gallery mgmt      | `super_admin`                  |
| `/admin/contact`               | Contact mgmt      | `super_admin`                  |
| `/admin/reviews`               | Reviews           | `super_admin`                  |
| `/admin/announcements`         | Announcements     | `super_admin`, `event_admin`   |
| `/admin/students`              | Students          | `super_admin`, `event_admin`   |
| `/admin/registrations`         | Registrations     | `super_admin`, `event_admin`   |
| `/admin/registration-outreach` | Outreach/email    | `super_admin`, `event_admin`   |
| `/admin/certificates` (+ add/edit) | Certificates  | `super_admin`, `event_admin`   |

The admin **sidebar** (`src/Admin/pages/components/Sidebar.jsx`) filters these
menu items by the logged-in role.

---

## Roles & permissions

Defined in **`src/Admin/config/roles.js`**. A user's role is read from the
`role` field of their Firestore document in the `users` collection.

| Role           | Scope                                                    |
| -------------- | -------------------------------------------------------- |
| `super_admin`  | Everything: dashboard, users, team, gallery, contact, reviews, plus all below |
| `blog_admin`   | Blogs + media library                                    |
| `event_admin`  | Events, certificates, registrations, announcements, students, outreach, media |

```js
import { ROLES } from "./src/Admin/config/roles.js";
// ROLES.SUPER_ADMIN, ROLES.BLOG_ADMIN, ROLES.EVENT_ADMIN
```

---

## Data layer / Firebase

Firebase is initialized once in `src/Firebase/firebase.js`, which exports
`auth`, `db`, and `storage`. Feature helpers live in `src/Firebase/*Service.js`:

| Service                   | Purpose                            |
| ------------------------- | ----------------------------------- |
| `eventService.js`          | Events (list/create/update/publish) |
| `blogService.js`           | Blogs & posts                       |
| `registrationService.js`  | Event registrations                 |
| `studentService.js`       | Student records                     |
| `announcementService.js`  | Announcements                       |
| `teamService.js`          | Team members                        |
| `reviewService.js`        | Event reviews                       |
| `certificateService.js`   | Certificates & verification         |

**`api/gallery.js`** is a serverless function that proxies Cloudinary's
gallery image listing (paginated + category-filtered), with a graceful
fallback when Cloudinary is unreachable.

Security rules live in `firestore.rules` and enforce:

- Public users may only **read** published events/announcements and
  **create** registrations.
- Only admin roles (checked against the `users` collection) may write events,
  announcements, students, registrations, and manage users.
- Composite indexes are declared in `firestore.indexes.json`.

---

## Media & uploads

- **Images / gallery** — Cloudinary. `src/services/galleryApi.js` talks to the
  `api/gallery.js` route; image metadata comes from a Cloudinary listing.
- **PDF certificates** — `src/services/cloudinaryService.js` uploads PDFs to a
  Cloudinary **unsigned** preset. Only the public cloud name + preset are used
  in client code — **no API secret** is ever shipped to the browser.
- **Rich text** — blogs/events are edited with a TipTap editor
  (`src/Admin/components/editor/`), backed by a media library
  (`src/Admin/components/media/`) and an autosave hook
  (`src/Admin/hooks/useAutosave.js`).

---

## SEO & static generation

- **`scripts/generate-sitemap.js`** — emits `sitemap.xml`,
  `sitemap-images.xml`, `sitemap-news.xml`, and `feed.xml` into `public/`
  during `npm run build`. Includes static routes plus any `Published` blogs and
  events fetched from Firestore (requires the local service-account file).
- **`scripts/prerender.js`** — serves the `dist` folder locally and uses
  **Puppeteer** to snapshot each route to static HTML under
  `dist/<route>/index.html` for crawlers. Run with `npm run prerender`.
- **SEO components** — per-page meta tags via react-helmet-async
  (`src/components/seo/SEO.jsx`) plus JSON-LD schemas under
  `src/components/seo/schemas/` (BlogPosting, Event, Organization, WebSite,
  CollectionPage, Breadcrumb).

---

## Design & content customization

Most visible content and nav labels live in **`src/data/club.js`**. Design
tokens (night-navy base, maroon/gold accents, Fraunces / Inter / Space Grotesk
typefaces) are defined in `src/styles/tokens.css`.

Sensible defaults to know about:

- The **hero video** is expected at `public/videos/hero-bg.mp4` (+ optional
  `.webm`). If missing, the hero falls back to a static gradient — safe either
  way. The video is skipped on screens < 640px and for "reduce-motion" users.
- Gallery/team tiles may show gradient placeholders until real media is
  uploaded through the admin panel.

---

## Deployment

The project comes with SPA-fallback config for several hosts:

- **Netlify** — `netlify.toml` (build `npm run build`, publish `dist`) with a
  `/* -> /index.html` rewrite, plus `public/_redirects`.
- **Vercel** — `vercel.json` rewrites all non-asset requests to `/index.html`.
- **Firebase** — `firebase.json` + `.firebaserc` configure the Firestore
  database (region `asia-south1`, rules + indexes); hosting can be added on
  top separately.
- **CI** — `.github/workflows/daily-build.yml` triggers a daily Netlify build
  (via a `NETLIFY_BUILD_HOOK_URL` secret) so sitemaps stay fresh.

---

## Secrets & security

> This is a **public repository**. Never commit secrets.

- `.gitignore` blocks `.env*`, `*.log`, and any `*-service-account*.json`
  (e.g. `firebase-service-account.json`, used at build time by the
  sitemap/pre-render scripts).
- Client-side Firebase config is public by design — it ships in the JS bundle
  (see `src/Firebase/firebase.js`). **Security comes from `firestore.rules`**,
  not from hiding the project ID.
- Cloudinary API secrets must stay server-side; the client only uses the public
  cloud name and unsigned upload preset.
- Any service account kept locally for sitemap/pre-render generation must stay
  out of version control.

---

## Contributing

1. Open a branch and PR against the default branch (`main`).
2. Run `npm run lint` and `npm run build` before pushing.
3. Never commit `.env`, `firebase-service-account.json`, or any secret.
4. If you change Firestore query patterns, update `firestore.indexes.json` and
   `firestore.rules` together.
