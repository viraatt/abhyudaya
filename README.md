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
