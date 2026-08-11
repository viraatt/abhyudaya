import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import BreadcrumbSchema from "../components/seo/schemas/BreadcrumbSchema.jsx";
import GallerySkeleton from "../components/gallery/GallerySkeleton.jsx";
import InteractiveTiltCard from "../components/gallery/InteractiveTiltCard.jsx";
import { fetchGalleryImages } from "../services/galleryApi.js";
import { FaTimes, FaChevronLeft, FaChevronRight, FaImages, FaPlay } from "react-icons/fa";
import "./Gallery.css";

const SITE_URL = "https://www.abhyudayaclub.in";

const CATEGORIES = [
  "all",
  "Flagship Fest",
  "Workshop",
  "Robotics",
  "Astronomy",
  "Quiz",
  "Entrepreneurship",
  "Design",
];

export default function Gallery() {
  const [allImages, setAllImages] = useState([]);   // full unfiltered pool
  const [images, setImages] = useState([]);          // filtered view
  const [activeCategory, setActiveCategory] = useState("all");
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loadedImages, setLoadedImages] = useState({});

  const breadcrumbItems = [
    { name: "Home", url: SITE_URL },
    { name: "Gallery", url: `${SITE_URL}/gallery` },
  ];

  // ── Load ALL images once on mount ──────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    async function loadAll() {
      setLoadingInitial(true);
      try {
        // Large limit so we get everything in one shot
        const res = await fetchGalleryImages({ page: 1, limit: 200, category: "all" });
        if (isMounted) {
          setAllImages(res.images || []);
          setImages(res.images || []);
        }
      } catch (err) {
        console.error("Failed to load gallery images:", err);
      } finally {
        if (isMounted) setLoadingInitial(false);
      }
    }
    loadAll();
    return () => { isMounted = false; };
  }, []);

  // ── Category filter (client-side, instant) ─────────────────────────────
  useEffect(() => {
    if (activeCategory === "all") {
      setImages(allImages);
    } else {
      setImages(
        allImages.filter(
          (img) => img.category?.toLowerCase() === activeCategory.toLowerCase()
        )
      );
    }
  }, [activeCategory, allImages]);

  // ── Image fade-in on load ──────────────────────────────────────────────
  const handleImageLoaded = (id) =>
    setLoadedImages((prev) => ({ ...prev, [id]: true }));

  // ── Lightbox ───────────────────────────────────────────────────────────
  const openLightbox = (card) => setSelectedImage(card);
  const closeLightbox = () => setSelectedImage(null);

  const handlePrevImage = useCallback(
    (e) => {
      if (e?.stopPropagation) e.stopPropagation();
      if (!selectedImage) return;
      const idx = images.findIndex((img) => img.uniqueKey === selectedImage.uniqueKey);
      setSelectedImage(images[(idx - 1 + images.length) % images.length]);
    },
    [selectedImage, images]
  );

  const handleNextImage = useCallback(
    (e) => {
      if (e?.stopPropagation) e.stopPropagation();
      if (!selectedImage) return;
      const idx = images.findIndex((img) => img.uniqueKey === selectedImage.uniqueKey);
      setSelectedImage(images[(idx + 1) % images.length]);
    },
    [selectedImage, images]
  );

  // ── Keyboard shortcuts for lightbox ───────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (!selectedImage) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") handlePrevImage(e);
      if (e.key === "ArrowRight") handleNextImage(e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedImage, handlePrevImage, handleNextImage]);

  const imageGallerySchema = {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    name: "Abhyudaya Club Photo Gallery",
    description:
      "Interactive photo gallery featuring events, workshops, hackathons, and moments from Abhyudaya Club at MPEC Kanpur.",
    url: `${SITE_URL}/gallery`,
    image: images.slice(0, 10).map((c) => c.src),
  };

  return (
    <div className="gallery-page">
      <Helmet>
        <title>Gallery | Abhyudaya Club — Event Photos &amp; Moments from MPEC Kanpur</title>
        <meta
          name="description"
          content="Explore the Pinterest masonry gallery of Abhyudaya Club at MPEC Kanpur — Cloudinary integrated event memories."
        />
        <link rel="canonical" href={`${SITE_URL}/gallery`} />
        <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1" />

        <meta property="og:type" content="website" />
        <meta property="og:title" content="Gallery | Abhyudaya Club — MPEC Kanpur" />
        <meta
          property="og:description"
          content="Interactive photo gallery of Abhyudaya Club events at Maharana Pratap Engineering College, Kanpur."
        />
        <meta property="og:url" content={`${SITE_URL}/gallery`} />
        <meta property="og:image" content={`${SITE_URL}/og-image.png`} />

        <script type="application/ld+json">
          {JSON.stringify(imageGallerySchema)}
        </script>
      </Helmet>

      <BreadcrumbSchema items={breadcrumbItems} />

      {/* ── In-flow header (scrolls off naturally) ── */}
      <header className="gallery-header-section">
        <span className="gallery-header-eyebrow">Visual Memories</span>
        <h1 className="gallery-header-title">Visual Memories &amp; Events</h1>
        <p className="gallery-header-subtitle">
          Explore curated moments, workshops, and flagship fests from Abhyudaya Club at MPEC Kanpur.
        </p>

        {/* Category Filter Bar */}
        <div className="gallery-filter-bar" role="tablist" aria-label="Gallery category filters">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={activeCategory === cat}
              className={`gallery-filter-btn ${activeCategory === cat ? "active" : ""}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat === "all" ? "✨ All Moments" : cat}
            </button>
          ))}
        </div>
      </header>

      <main className="gallery-main">
        {/* Skeleton while loading */}
        {loadingInitial ? (
          <GallerySkeleton count={12} />
        ) : images.length === 0 ? (
          <div className="gallery-empty-state">
            <FaImages className="gallery-empty-icon" />
            <h3 className="gallery-empty-title">No Media Found</h3>
            <p className="gallery-empty-desc">
              There are no gallery items under this category yet.
            </p>
            <button
              type="button"
              className="gallery-filter-btn active"
              onClick={() => setActiveCategory("all")}
            >
              View All Photos
            </button>
          </div>
        ) : (
          /* ── CSS column-count masonry — stable, no re-flow glitch ── */
          <div className="gallery-masonry-grid">
            {images.map((card) => {
              const isLoaded = loadedImages[card.uniqueKey];
              return (
                <div key={card.uniqueKey} className="gallery-masonry-item">
                  <InteractiveTiltCard onClick={() => openLightbox(card)}>
                    <div className="gallery-pinterest-card">
                      {/* Image / Video tile */}
                      <div className="gallery-clean-tile">
                        {/* Shimmer shown until media loaded */}
                        {!isLoaded && <div className="gallery-skeleton-shimmer" />}

                        {card.isVideo ? (
                          <div className="gallery-video-wrap">
                            <video
                              src={card.src}
                              className={`gallery-clean-media ${isLoaded ? "loaded" : ""}`}
                              onLoadedData={() => handleImageLoaded(card.uniqueKey)}
                              muted
                              playsInline
                              loop
                              autoPlay
                            />
                            <div className="gallery-video-badge">
                              <div className="gallery-video-play-btn">
                                <FaPlay />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <img
                            src={card.src}
                            alt={card.title || "Club event photo"}
                            loading="lazy"
                            decoding="async"
                            onLoad={() => handleImageLoaded(card.uniqueKey)}
                            onError={(e) => {
                              // Show a subtle fallback colour if image breaks
                              e.currentTarget.style.opacity = "0.4";
                              handleImageLoaded(card.uniqueKey);
                            }}
                            className={`gallery-clean-media ${isLoaded ? "loaded" : ""}`}
                          />
                        )}
                      </div>

                      {/* Below-tile caption */}
                      <div className="gallery-tile-caption">
                        <h3 className="gallery-tile-title">{card.title}</h3>
                        <div className="gallery-tile-meta">
                          <span className="gallery-tile-category">{card.category}</span>
                        </div>
                      </div>
                    </div>
                  </InteractiveTiltCard>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Lightbox Modal ── */}
      <AnimatePresence>
        {selectedImage && (
          <>
            <motion.div
              className="gallery-overlay-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeLightbox}
            />
            <motion.div
              className="gallery-overlay-modal"
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              {/* Close */}
              <button
                type="button"
                className="gallery-overlay-close-btn"
                onClick={closeLightbox}
                aria-label="Close modal"
              >
                <FaTimes />
              </button>

              {/* Media stage */}
              <div className="gallery-overlay-image-box">
                {selectedImage.isVideo ? (
                  <video
                    src={selectedImage.src}
                    controls
                    autoPlay
                    playsInline
                    className="gallery-overlay-img"
                  />
                ) : (
                  <img
                    src={selectedImage.src}
                    alt={selectedImage.title}
                    className="gallery-overlay-img"
                  />
                )}

                <button
                  type="button"
                  className="gallery-overlay-nav-btn gallery-nav-left"
                  onClick={handlePrevImage}
                  aria-label="Previous media"
                >
                  <FaChevronLeft />
                </button>
                <button
                  type="button"
                  className="gallery-overlay-nav-btn gallery-nav-right"
                  onClick={handleNextImage}
                  aria-label="Next media"
                >
                  <FaChevronRight />
                </button>
              </div>

              {/* Sidebar info */}
              <div className="gallery-overlay-sidebar">
                <div>
                  <span className="gallery-modal-badge">{selectedImage.category}</span>
                  <h2 className="gallery-modal-title">{selectedImage.title}</h2>
                  <p className="gallery-modal-desc">
                    {selectedImage.description || "Abhyudaya Club Event Snapshot at MPEC Kanpur."}
                  </p>
                </div>
                <div className="gallery-modal-footer">
                  <span>Press Esc to close • Use ← → keys to navigate</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}