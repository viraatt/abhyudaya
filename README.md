# Abhyudaya Club — Website

A single-page site for the Abhyudaya Club (MPEC Kanpur, Department of Basic
Sciences & Humanities), built with React, Vite, and React Router.

## Getting started

```bash
npm install
npm run dev       # local dev server
npm run build      # production build -> dist/
npm run preview    # preview the production build
```

## Project structure

```
src/
  main.jsx            # app entry, router + global styles
  App.jsx              # route definitions
  data/
    club.js            # all editable content: nav, events, team, socials
  components/
    Layout.jsx          # Header + <Outlet/> + Footer wrapper
    Header.jsx / .css
    Footer.jsx / .css
    PageHero.jsx / .css # shared hero banner for interior pages
    ScrollToTop.jsx     # resets scroll on route change
  pages/
    Home.jsx / .css
    About.jsx / .css
    Events.jsx / .css
    Team.jsx / .css
    Gallery.jsx / .css
    Contact.jsx / .css
    NotFound.jsx / .css
  styles/
    tokens.css          # color/type/layout design tokens
    shared.css          # shared button/link/section classes
```

## What to customize before publishing

- **`src/data/club.js`** — this is the one file most content lives in:
  social links, email, nav labels, the event list, and the team roster.
- **Team photos/names** — `Team.jsx` currently renders placeholder role
  cards (initials only). Swap in real names, and add an `image` field +
  `<img>` if you want photos instead of initials.
- **Gallery photos** — `Gallery.jsx` uses styled gradient tiles as
  placeholders. Replace the `background` style per tile with a real
  `<img src="..." />` once event photography is available.
- **Contact form** — `Contact.jsx` has a working, accessible form UI but
  no backend. Wire the `handleSubmit` function up to an email/form
  service (Formspree, Google Forms, your own API, etc.).

## Adding the hero background video

Drop your video file(s) directly into:

```
public/videos/hero-bg.mp4     (required)
public/videos/hero-bg.webm    (optional, but recommended — smaller & loads faster)
```

Nothing else needs to change — `Home.jsx` already points at those exact
paths. If the files aren't there yet, the hero just shows the navy
gradient underneath with no errors, so it's safe to ship without it.

**Keeping it low-latency:**
- Keep the clip short (10–20s) and loopable — it's playing on repeat, not once.
- Export at 1080p or lower, no audio track, and compress it (HandBrake or
  `ffmpeg -i in.mov -vcodec h264 -crf 28 -an public/videos/hero-bg.mp4`
  is a good starting point). Aim for well under ~5MB.
- A `.webm` (VP9) version alongside the `.mp4` is usually 30–50% smaller
  and browsers will prefer it automatically — the `<video>` tag already
  lists it first.
- The video is skipped entirely on screens narrower than 640px and for
  anyone with "reduce motion" turned on — mobile always gets the fast,
  static gradient instead, so there's nothing to tune for phones there.

## Design notes

The visual identity now follows the real club logo: a night-navy base,
the logo's maroon (`--horizon`) and gold (`--sun`) as accents, and the
same rising-sun idea carried through as gradient/horizon-line motifs
site-wide. Typefaces are Fraunces (display), Inter (body), and Space
Grotesk (labels/utility text). Logo files live in `src/assets/` at two
sizes (`logo-120.png` for header/footer, `logo-512.png` for the hero).

## Mobile

Layout is fluid end-to-end (`clamp()` type scale, responsive grids,
a slide-in nav under 860px), and the hero video is swapped for a static
gradient under 640px to keep phones fast and light on data.
