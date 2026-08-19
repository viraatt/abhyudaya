import { getGalleryItems } from "../Admin/pages/services/galleryService.js";
import { getMediaItems } from "../Admin/pages/services/mediaService.js";

// Lazy (non-eager) glob — images are NOT bundled into the JS chunk.
// Each asset is only fetched if actually referenced at runtime.
const imageModules = import.meta.glob(
  "../assets/**/*.{jpg,jpeg,png,gif,webp}",
  { eager: false }
);

// ── In-memory cache so Firestore is only queried once per session ──────────
let _galleryCache = null;
let _cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getImagePath(pathStr) {
  if (!pathStr) return "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800";
  if (pathStr.startsWith("http://") || pathStr.startsWith("https://")) {
    return pathStr;
  }
  const modulePath = `../${pathStr}`;
  return imageModules[modulePath]?.default || pathStr;
}

/**
 * Curated fallback showcase gallery cards with Cloudinary & high quality assets
 */
const BASE_SHOWCASE = [
  {
    id: "techbloom-2-main",
    title: "TechBloom 2.0 Flagship Fest",
    category: "Flagship Fest",
    src: getImagePath("assets/9ae3f21a-b6bf-4115-8c6b-a44b01f95bf9.jpg"),
    public_id: "abhyudaya/techbloom_2",
    width: 1200,
    height: 800,
    aspectRatio: "16/9",
    photos: [getImagePath("assets/9ae3f21a-b6bf-4115-8c6b-a44b01f95bf9.jpg")],
    description: "Annual technical fest bringing speaker sessions, hackathons, and live flying demos.",
  },
  {
    id: "aeromodelling-1",
    title: "Aeromodelling & RC Flying",
    category: "Workshop",
    src: getImagePath("assets/AM3COVER.jpg"),
    public_id: "abhyudaya/aeromodelling",
    width: 900,
    height: 1200,
    aspectRatio: "3/4",
    photos: [getImagePath("assets/AM3COVER.jpg")],
    description: "Hands-on RC plane designing and live flight demonstrations at MPEC campus.",
  },
  {
    id: "web-dev-workshop",
    title: "Fullstack Web Development",
    category: "Workshop",
    src: getImagePath("assets/WD4COVER.jpg"),
    public_id: "abhyudaya/web_dev",
    width: 1000,
    height: 1000,
    aspectRatio: "1/1",
    photos: [getImagePath("assets/WD4COVER.jpg")],
    description: "Interactive session teaching modern frontend frameworks and web APIs.",
  },
  {
    id: "antariksh-1",
    title: "Antariksh Spardha Astronomy Fest",
    category: "Astronomy",
    src: getImagePath("assets/cover2.jpg"),
    public_id: "abhyudaya/antariksh",
    width: 1200,
    height: 750,
    aspectRatio: "16/10",
    photos: [getImagePath("assets/cover2.jpg")],
    description: "Night sky observation and astrophysics guest lectures with IIT Kanpur Astro Club.",
  },
  {
    id: "cloud-feed-sample-1",
    title: "Robot Arena Showcase",
    category: "Robotics",
    src: "https://res.cloudinary.com/cn11zsvp/image/upload/v1785739786/t8wbjv8bvkkzddzkusm3.jpg",
    public_id: "t8wbjv8bvkkzddzkusm3",
    width: 1200,
    height: 900,
    aspectRatio: "4/3",
    photos: ["https://res.cloudinary.com/cn11zsvp/image/upload/v1785739786/t8wbjv8bvkkzddzkusm3.jpg"],
    description: "Autonomous bot race and obstacle clearing competition during TechBloom.",
  },
  {
    id: "quiztronix-event",
    title: "Quiztronix Technical Challenge",
    category: "Quiz",
    src: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900&auto=format&fit=crop",
    public_id: "unsplash_quiztronix",
    width: 900,
    height: 1100,
    aspectRatio: "9/11",
    photos: ["https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900&auto=format&fit=crop"],
    description: "Rapid-fire technical quiz testing science, programming, and logic.",
  },
  {
    id: "nextgen-ventures",
    title: "NextGen Ventures Pitching",
    category: "Entrepreneurship",
    src: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=900&auto=format&fit=crop",
    public_id: "unsplash_startup",
    width: 1200,
    height: 800,
    aspectRatio: "3/2",
    photos: ["https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=900&auto=format&fit=crop"],
    description: "Student entrepreneurs pitching business ideas to industry judges.",
  },
  {
    id: "posterverse-art",
    title: "Poster Verse Exhibition",
    category: "Design",
    src: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=900&auto=format&fit=crop",
    public_id: "unsplash_design",
    width: 800,
    height: 1200,
    aspectRatio: "2/3",
    photos: ["https://images.unsplash.com/photo-1561070791-2526d30994b5?w=900&auto=format&fit=crop"],
    description: "Creative digital & hand-drawn technical poster design competition.",
  },
];

function checkIsVideo(url, format) {
  if (!url) return false;
  if (format && ["mp4", "webm", "mov", "avi", "mkv"].includes(format.toLowerCase())) return true;
  return /\.(mp4|webm|mov|avi|mkv)($|\?)/i.test(url);
}

/**
 * Fetch all gallery images & videos by combining Cloudinary API, Firestore database, and fallback data.
 */
export async function fetchGalleryImages({ page = 1, limit = 8, category = "all" } = {}) {
  // ── Return cached data if still fresh (avoids 3 Firestore reads on every visit) ─
  const now = Date.now();
  if (_galleryCache && now - _cacheTimestamp < CACHE_TTL_MS) {
    const filteredImages = category && category !== "all"
      ? _galleryCache.filter(img => img.category.toLowerCase() === category.toLowerCase())
      : _galleryCache;
    const total = filteredImages.length;
    const startIndex = (page - 1) * limit;
    const sliced = filteredImages.slice(startIndex, startIndex + limit);
    return {
      images: sliced.map((img, i) => ({ ...img, uniqueKey: `pg${page}-${img.id}-${i}` })),
      page, limit, total, hasMore: true, isLooped: false,
    };
  }

  let fetchedCloudImages = [];

  // 1. Try serverless backend /api/gallery
  try {
    const res = await fetch(`/api/gallery?page=${page}&limit=${limit}&category=${category}`);
    if (res.ok) {
      const data = await res.json();
      if (data.images && data.images.length > 0) {
        fetchedCloudImages = data.images.map((img, idx) => {
          const isVideo = checkIsVideo(img.secure_url, img.format);
          return {
            id: img.id || `api-${idx}`,
            title: img.title || "Cloudinary Media",
            category: img.category || "Events",
            src: img.secure_url,
            isVideo,
            public_id: img.public_id,
            width: img.width || 800,
            height: img.height || 600,
            aspectRatio: img.height ? `${img.width}/${img.height}` : "4/3",
            photos: [img.secure_url],
            description: img.alt || "Uploaded to Cloudinary",
          };
        });
      }
    }
  } catch {
    // API endpoint route silent fallback
  }

  // 2. Fetch Firestore Gallery items
  let firestoreItems = [];
  try {
    const dbGallery = await getGalleryItems();
    if (dbGallery && dbGallery.length > 0) {
      firestoreItems = dbGallery.map((item, index) => {
        const url = getImagePath(item.imageUrl || item.videoUrl);
        const isVideo = item.isVideo || checkIsVideo(url);
        return {
          id: item.id || `db-gal-${index}`,
          title: item.title || "Gallery Moment",
          category: item.category || "Events",
          src: url,
          isVideo,
          public_id: item.public_id || `db-${index}`,
          width: item.width || 900,
          height: item.height || 675,
          aspectRatio: item.height ? `${item.width}/${item.height}` : "4/3",
          photos: [url],
          description: item.description || item.title || "",
        };
      });
    }
  } catch (err) {
    console.warn("Firestore gallery query fallback:", err);
  }

  // 3. Fetch Firestore Media Library items
  let mediaLibraryItems = [];
  try {
    const dbMedia = await getMediaItems();
    if (dbMedia && dbMedia.length > 0) {
      mediaLibraryItems = dbMedia.map((item, index) => {
        const url = getImagePath(item.url);
        const isVideo = item.isVideo || checkIsVideo(url);
        return {
          id: item.id || `db-med-${index}`,
          title: item.name || "Cloudinary Media",
          category: "Cloud Media",
          src: url,
          isVideo,
          public_id: item.public_id || `med-${index}`,
          width: item.width || 1000,
          height: item.height || 750,
          aspectRatio: item.height ? `${item.width}/${item.height}` : "4/3",
          photos: [url],
          description: "Cloudinary media library item",
        };
      });
    }
  } catch (err) {
    console.warn("Firestore media query fallback:", err);
  }

  // Combine and deduplicate images strictly by public_id and normalized src URL
  const combinedMap = new Map();

  const getDedupeKey = (card) => {
    if (card.public_id && !card.public_id.startsWith("db-") && !card.public_id.startsWith("med-") && !card.public_id.startsWith("unsplash_")) {
      return card.public_id.toLowerCase().trim();
    }
    if (!card.src) return null;
    try {
      const urlObj = new URL(card.src, "https://abhyudayaclub.in");
      return (urlObj.origin + urlObj.pathname).toLowerCase();
    } catch {
      return card.src.toLowerCase().trim();
    }
  };

  [...fetchedCloudImages, ...firestoreItems, ...mediaLibraryItems, ...BASE_SHOWCASE].forEach((card) => {
    const key = getDedupeKey(card);
    if (key && !combinedMap.has(key)) {
      combinedMap.set(key, card);
    }
  });

  const allImages = Array.from(combinedMap.values());

  // ── Store in cache for next call ────────────────────────────────────────
  _galleryCache = allImages;
  _cacheTimestamp = Date.now();

  // Filter by category if requested
  const filteredImages = category && category !== "all"
    ? allImages.filter(img => img.category.toLowerCase() === category.toLowerCase())
    : allImages;

  // Pagination indexing
  const total = filteredImages.length;
  const startIndex = (page - 1) * limit;
  const sliced = filteredImages.slice(startIndex, startIndex + limit);

  // Looping logic: If requested page goes beyond total unique images, loop seamlessly
  let resultBatch = sliced;
  let isLooped = false;

  if (resultBatch.length === 0 && total > 0) {
    isLooped = true;
    const loopOffset = startIndex % total;
    resultBatch = filteredImages.slice(loopOffset, loopOffset + limit);
    if (resultBatch.length < limit) {
      const remainingNeeded = limit - resultBatch.length;
      resultBatch = [...resultBatch, ...filteredImages.slice(0, remainingNeeded)];
    }
  }

  return {
    images: resultBatch.map((img, i) => ({
      ...img,
      uniqueKey: `pg${page}-${img.id}-${i}`,
    })),
    page,
    limit,
    total,
    hasMore: true, // Always allow infinite scroll to keep going via recycling logic!
    isLooped,
  };
}
