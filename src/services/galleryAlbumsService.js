import { getPublishedGalleryItems } from "../Admin/pages/services/galleryService.js";
import {
  getCloudinaryThumbnail,
  getCloudinaryFullImage,
  FALLBACK_IMAGE,
} from "../utils/cloudinaryOptimized.js";
import {
  normalizeCategory,
  formatDisplayDate,
  yearFromDate,
} from "../utils/galleryConstants.js";

// Vite asset imports for local images to guarantee zero broken relative URLs
import techBloomCover from "../assets/9ae3f21a-b6bf-4115-8c6b-a44b01f95bf9.jpg";
import aeromodellingCover from "../assets/AM3COVER.jpg";
import webDevCover from "../assets/WD4COVER.jpg";
import astronomyCover from "../assets/cover2.jpg";

/**
 * Curated Event Albums with rich photography collections.
 * Used ONLY as a fallback when Firestore has zero gallery documents.
 * Once Firestore contains albums, Firestore is the single source of truth.
 */
export const STATIC_ALBUMS = [
  {
    id: "techbloom-2",
    slug: "techbloom-2",
    title: "TechBloom 2.0 Flagship Fest",
    subtitle: "Flagship Technical Festival",
    category: "Festivals",
    date: "16 February 2026",
    year: "2026",
    description: "Annual technical festival bringing speaker sessions, hackathons, robotics arena challenges, and live aircraft flying demos under one roof at MPEC campus.",
    coverImage: techBloomCover,
    featured: true,
    photoCount: 16,
    photos: [
      {
        id: "tb-01",
        title: "Inauguration & Lighting Ceremony",
        description: "Dignitaries and faculty advisors lighting the lamp to inaugurate TechBloom 2.0.",
        src: techBloomCover,
        width: 1200,
        height: 800,
        aspectRatio: "16/9",
      },
      {
        id: "tb-02",
        title: "Robotics Arena Challenge",
        description: "Custom autonomous and RC bot navigation through obstacle tracks in the main arena.",
        src: "https://res.cloudinary.com/cn11zsvp/image/upload/v1785739786/t8wbjv8bvkkzddzkusm3.jpg",
        width: 1200,
        height: 900,
        aspectRatio: "4/3",
      },
      {
        id: "tb-03",
        title: "Audience & Keynote Session",
        description: "Over 800 students packed the auditorium for the industry tech leaders keynote.",
        src: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80",
        width: 1200,
        height: 800,
        aspectRatio: "3/2",
      },
      {
        id: "tb-04",
        title: "Live Flying Demonstration",
        description: "Student-built fixed-wing RC aircraft taking off on the college main ground.",
        src: aeromodellingCover,
        width: 900,
        height: 1200,
        aspectRatio: "3/4",
      },
      {
        id: "tb-05",
        title: "Hackathon Coding Sprint",
        description: "Teams developing fullstack web solutions during the 12-hour hackathon challenge.",
        src: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80",
        width: 1200,
        height: 800,
        aspectRatio: "3/2",
      },
      {
        id: "tb-06",
        title: "Technical Project Expo",
        description: "Hardware prototypes, IoT setups, and solar tracking systems exhibited by club members.",
        src: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&q=80",
        width: 1200,
        height: 800,
        aspectRatio: "3/2",
      },
      {
        id: "tb-07",
        title: "Awards & Trophy Presentation",
        description: "Winners of the technical competitions receiving certificates, trophies, and cash prizes.",
        src: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80",
        width: 1200,
        height: 800,
        aspectRatio: "3/2",
      },
      {
        id: "tb-08",
        title: "Core Organizing Committee",
        description: "The student leadership team and coordinators behind TechBloom 2.0.",
        src: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80",
        width: 1200,
        height: 800,
        aspectRatio: "3/2",
      }
    ]
  },
  {
    id: "antariksh-spardha",
    slug: "antariksh-spardha",
    title: "Antariksh Spardha Astronomy Fest",
    subtitle: "Space Exploration & Observation",
    category: "Talks",
    date: "10 November 2025",
    year: "2025",
    description: "3-day astronomy festival featuring telescope night sky observation, deep-sky astro-photography, and guest lectures in partnership with IIT Kanpur Astro Club.",
    coverImage: astronomyCover,
    featured: false,
    photoCount: 12,
    photos: [
      {
        id: "as-01",
        title: "Night Sky Telescope Observation",
        description: "Students observing Jupiter's moons and Saturn's rings through high-power motorized telescopes.",
        src: astronomyCover,
        width: 1200,
        height: 750,
        aspectRatio: "16/10",
      },
      {
        id: "as-02",
        title: "Astrophysics Guest Lecture",
        description: "Interactive session by space scientists exploring celestial navigation and planetary science.",
        src: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
        width: 1200,
        height: 800,
        aspectRatio: "3/2",
      },
      {
        id: "as-03",
        title: "Space Science Quiz Round",
        description: "Teams answering rapid-fire astrophysics and satellite technology questions.",
        src: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
        width: 900,
        height: 1200,
        aspectRatio: "3/4",
      },
      {
        id: "as-04",
        title: "Satellite & Rocket Model Exhibition",
        description: "Scale models of ISRO launch vehicles (PSLV, LVM3) created by aerospace enthusiasts.",
        src: "https://images.unsplash.com/photo-1517976487586-13d82a17f694?auto=format&fit=crop&w=1200&q=80",
        width: 1200,
        height: 800,
        aspectRatio: "3/2",
      }
    ]
  },
  {
    id: "aeromodelling-workshop",
    slug: "aeromodelling-workshop",
    title: "Aeromodelling & RC Flying Workshop",
    subtitle: "Aerodynamics & Flight Design",
    category: "Workshops",
    date: "18 October 2025",
    year: "2025",
    description: "Hands-on RC airplane and quadcopter fabrication workshop covering airfoils, brushless motor dynamics, telemetry systems, and live outdoor test flights.",
    coverImage: aeromodellingCover,
    featured: false,
    photoCount: 14,
    photos: [
      {
        id: "am-01",
        title: "Fuselage & Wing Assembly",
        description: "Step-by-step wing cutting and balsa wood assembly by student teams.",
        src: aeromodellingCover,
        width: 900,
        height: 1200,
        aspectRatio: "3/4",
      },
      {
        id: "am-02",
        title: "Electronics & ESC Calibration",
        description: "Wiring transmitters, receivers, brushless motors, and electronic speed controllers.",
        src: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80",
        width: 1200,
        height: 800,
        aspectRatio: "3/2",
      },
      {
        id: "am-03",
        title: "Runway Launch Testing",
        description: "First gliding tests on the football ground checking center of gravity.",
        src: "https://images.unsplash.com/photo-1519074069444-1ba4fff16def?auto=format&fit=crop&w=1200&q=80",
        width: 1200,
        height: 800,
        aspectRatio: "3/2",
      }
    ]
  },
  {
    id: "web-dev-workshop",
    slug: "web-dev-workshop",
    title: "Fullstack Web & Cloud Workshop",
    subtitle: "Modern Web Engineering",
    category: "Workshops",
    date: "24 September 2025",
    year: "2025",
    description: "Intensive 2-day hands-on boot camp covering React, modern APIs, Cloudinary media optimization, and Firebase database architecture.",
    coverImage: webDevCover,
    featured: false,
    photoCount: 10,
    photos: [
      {
        id: "wd-01",
        title: "Interactive Coding Labs",
        description: "Hands-on coding session in Computer Center labs building scalable web applications.",
        src: webDevCover,
        width: 1000,
        height: 1000,
        aspectRatio: "1/1",
      },
      {
        id: "wd-02",
        title: "System Architecture Lecture",
        description: "Understanding client-side routing, API integration, and cloud media delivery.",
        src: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80",
        width: 1200,
        height: 800,
        aspectRatio: "3/2",
      }
    ]
  },
  {
    id: "communicraft-summit",
    slug: "communicraft-summit",
    title: "CommuniCraft Leadership Summit",
    subtitle: "Communication & Public Speaking",
    category: "Competitions",
    date: "14 August 2025",
    year: "2025",
    description: "Annual debate, parliamentary group discussions, and personality enrichment summit organized to develop articulate communication and leadership skills.",
    coverImage: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1200&q=80",
    featured: false,
    photoCount: 8,
    photos: [
      {
        id: "cc-01",
        title: "Parliamentary Debate Finals",
        description: "Debaters presenting compelling arguments on contemporary technology and ethics.",
        src: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1200&q=80",
        width: 1200,
        height: 800,
        aspectRatio: "3/2",
      },
      {
        id: "cc-02",
        title: "Group Discussion Round",
        description: "Students undergoing corporate-style group discussions with faculty jury evaluation.",
        src: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1200&q=80",
        width: 1200,
        height: 800,
        aspectRatio: "3/2",
      }
    ]
  },
  {
    id: "poster-verse",
    slug: "poster-verse",
    title: "Poster Verse Art & Tech Exhibition",
    subtitle: "Technical Visual Design",
    category: "Competitions",
    date: "12 May 2025",
    year: "2025",
    description: "Creative digital illustration and hand-drawn technical poster design competition showcasing scientific innovations and environmental awareness.",
    coverImage: "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=1200&q=80",
    featured: false,
    photoCount: 9,
    photos: [
      {
        id: "pv-01",
        title: "Poster Gallery Display",
        description: "Shortlisted creative posters exhibited along the main college corridor for peer voting.",
        src: "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=1200&q=80",
        width: 1200,
        height: 800,
        aspectRatio: "3/2",
      }
    ]
  }
];

// In-memory cache for albums metadata to avoid unnecessary repeat reads.
// Reduced to 30 seconds so Admin → Public updates appear quickly.
let _albumsCache = null;
let _albumsCacheTimestamp = 0;
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

/**
 * Invalidates the in-memory album cache.
 * Called after create/update/delete so the public Gallery reflects changes immediately.
 */
export function invalidateGalleryCache() {
  _albumsCache = null;
  _albumsCacheTimestamp = 0;
}

/**
 * Normalizes a Firestore album document into the public album card shape.
 * `doc` is a plain object: { id, ...data } as returned by getGalleryItems().
 */
function normalizeFirestoreAlbum(doc) {
  const data = doc || {};
  const id = data.id || data.slug || "";
  const photos = Array.isArray(data.photos) ? data.photos : [];
  const coverImage = data.coverImage || (photos.length > 0 ? photos[0].src : "") || FALLBACK_IMAGE;

  return {
    id,
    slug: data.slug || id,
    title: data.title || "Untitled Album",
    subtitle: data.subtitle || "",
    category: normalizeCategory(data.category),
    date: formatDisplayDate(data.date),
    year: data.year || yearFromDate(data.date),
    description: data.description || "",
    coverImage,
    featured: Boolean(data.featured),
    photoCount: photos.length,
    status: data.status || "Published",
    photos,
  };
}

/**
 * Fetches published albums from Firestore.
 * Falls back to STATIC_ALBUMS ONLY when Firestore has zero documents.
 */
async function fetchPublishedAlbums() {
  const dbItems = await getPublishedGalleryItems();

  // Firestore has albums → Firestore is the source of truth
  if (Array.isArray(dbItems) && dbItems.length > 0) {
    return dbItems.map(normalizeFirestoreAlbum);
  }

  // Firestore has zero albums → optional STATIC_ALBUMS fallback
  return STATIC_ALBUMS.map((album) => ({
    ...album,
    category: normalizeCategory(album.category),
    date: formatDisplayDate(album.date),
  }));
}

/**
 * Fetches lightweight Album metadata for the Gallery homepage.
 * Returns only: { id, slug, title, subtitle, category, date, year, description, coverThumbnail, coverImage, photoCount, featured }
 * Does NOT download all event photos upfront!
 */
export async function getGalleryAlbums({ category = "all", search = "", year = "all" } = {}) {
  const now = Date.now();
  let albums = _albumsCache;

  if (!albums || now - _albumsCacheTimestamp > CACHE_TTL_MS) {
    try {
      albums = await fetchPublishedAlbums();
    } catch (err) {
      console.error("Gallery fetch failed:", err);
      throw err;
    }

    _albumsCache = albums;
    _albumsCacheTimestamp = now;
  }

  // Apply filters on lightweight metadata
  let filtered = [...albums];

  if (category && category !== "all") {
    filtered = filtered.filter((a) => a.category.toLowerCase() === category.toLowerCase());
  }

  if (year && year !== "all") {
    filtered = filtered.filter((a) => String(a.year) === String(year));
  }

  if (search && search.trim()) {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
    );
  }

  // Return album cards with optimized cover thumbnail URLs
  return filtered.map((album) => ({
    id: album.id,
    slug: album.slug,
    title: album.title,
    subtitle: album.subtitle,
    category: album.category,
    date: album.date,
    year: album.year,
    description: album.description,
    coverThumbnail: getCloudinaryThumbnail(album.coverImage),
    coverImage: album.coverImage,
    photoCount: album.photoCount || album.photos?.length || 0,
    featured: Boolean(album.featured),
  }));
}

/**
 * Fetches full album details including all event photos for the dedicated /gallery/:eventSlug page.
 */
export async function getAlbumBySlug(slug) {
  if (!slug) return null;

  // Make sure cache or base albums are loaded
  if (!_albumsCache) {
    await getGalleryAlbums();
  }

  const all = _albumsCache || STATIC_ALBUMS;
  const album = all.find((a) => a.slug === slug || a.id === slug);

  if (!album) return null;

  // Prepare photos with both thumbnail and full-resolution Cloudinary URLs
  const optimizedPhotos = (album.photos || []).map((photo, index) => ({
    id: photo.id || `photo-${index}`,
    title: photo.title || `${album.title} — Moment ${index + 1}`,
    description: photo.description || album.description,
    thumbnailSrc: getCloudinaryThumbnail(photo.src || photo.thumbnailSrc || photo.rawSrc),
    fullSrc: getCloudinaryFullImage(photo.src || photo.fullSrc || photo.rawSrc),
    rawSrc: photo.rawSrc || photo.src || "",
    src: photo.src || photo.rawSrc || "",
    width: photo.width || 1200,
    height: photo.height || 800,
    aspectRatio: photo.aspectRatio || "4/3",
    isVideo: Boolean(photo.isVideo),
  }));

  return {
    ...album,
    coverThumbnail: getCloudinaryThumbnail(album.coverImage),
    photos: optimizedPhotos,
    photoCount: optimizedPhotos.length,
  };
}

/**
 * Editorial spotlight moments for Section 7: "Moments That Define Us"
 */
export const EDITORIAL_MOMENTS = [
  {
    id: "moment-1",
    tagline: "Learning Together",
    subtitle: "Workshop Series",
    title: "Hands-on Code & Engineering Labs",
    albumSlug: "web-dev-workshop",
    image: webDevCover,
    description: "Students building fullstack web apps and hardware controllers side-by-side.",
  },
  {
    id: "moment-2",
    tagline: "Creating Together",
    subtitle: "TechBloom 2.0",
    title: "Autonomous Robotics & RC Flight",
    albumSlug: "techbloom-2",
    image: techBloomCover,
    description: "Prototyping, testing, and flying student-built fixed-wing models on college grounds.",
  },
  {
    id: "moment-3",
    tagline: "Celebrating Together",
    subtitle: "Antariksh Spardha",
    title: "Stargazing & Space Discoveries",
    albumSlug: "antariksh-spardha",
    image: astronomyCover,
    description: "Deep sky exploration through high-power telescopes with IIT Kanpur Astro Club.",
  },
];

/**
 * Hero Collage Photographs for the 2-column editorial layout
 */
export const HERO_COLLAGE_PHOTOS = [
  {
    id: "hero-1",
    src: techBloomCover,
    title: "TechBloom 2.0 Opening",
    category: "Flagship Fest",
    dominant: true,
  },
  {
    id: "hero-2",
    src: aeromodellingCover,
    title: "RC Aircraft Design",
    category: "Workshop",
    dominant: false,
  },
  {
    id: "hero-3",
    src: astronomyCover,
    title: "Night Sky Observation",
    category: "Astronomy",
    dominant: false,
  },
  {
    id: "hero-4",
    src: webDevCover,
    title: "Fullstack Lab",
    category: "Coding",
    dominant: false,
  },
];

/**
 * Surprise Me: returns a random photo across published albums for instant lightbox opening.
 */
export async function getRandomHighlightPhoto() {
  if (!_albumsCache) {
    await getGalleryAlbums();
  }
  const albums = _albumsCache || STATIC_ALBUMS;
  const allPhotos = [];
  albums.forEach((alb) => {
    (alb.photos || []).forEach((p) => {
      allPhotos.push({
        ...p,
        albumTitle: alb.title,
        albumSlug: alb.slug,
        albumCategory: alb.category,
        thumbnailSrc: getCloudinaryThumbnail(p.src || p.thumbnailSrc || p.rawSrc),
        fullSrc: getCloudinaryFullImage(p.src || p.fullSrc || p.rawSrc),
      });
    });
  });

  if (allPhotos.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * allPhotos.length);
  return allPhotos[randomIndex];
}