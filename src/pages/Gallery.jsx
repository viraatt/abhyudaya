import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import BreadcrumbSchema from "../components/seo/schemas/BreadcrumbSchema.jsx";
import GallerySkeleton from "../components/gallery/GallerySkeleton.jsx";
import InteractiveTiltCard from "../components/gallery/InteractiveTiltCard.jsx";
import { fetchGalleryImages } from "../services/galleryApi.js";
import { FaTimes, FaChevronLeft, FaChevronRight, FaSync, FaImages, FaPlay } from "react-icons/fa";
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
  const [images, setImages] = useState([]);
  const [page, setPage] = useState(1);
  const [activeCategory, setActiveCategory] = useState("all");
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isLooped, setIsLooped] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loadedImages, setLoadedImages] = useState({});

  const sentinelRef = useRef(null);
  const isFetchingRef = useRef(false);

  const breadcrumbItems = [
    { name: "Home", url: SITE_URL },
    { name: "Gallery", url: `${SITE_URL}/gallery` },
  ];

  // Load initial batch of images on category change asynchronously
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoadingInitial(true);
      setPage(1);
      setIsLooped(false);
      isFetchingRef.current = true;

      try {
        const res = await fetchGalleryImages({ page: 1, limit: 12, category: activeCategory });
        if (isMounted) {
          setImages(res.images || []);
          setIsLooped(res.isLooped || false);
        }
      } catch (err) {
        console.error("Failed to load initial gallery images:", err);
      } finally {
        if (isMounted) {
          setLoadingInitial(false);
          isFetchingRef.current = false;
        }
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [activeCategory]);

  // Infinite Scroll IntersectionObserver & batch loader
  const loadNextBatch = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoadingMore(true);

    const nextPage = page + 1;
    try {
      const res = await fetchGalleryImages({
        page: nextPage,
        limit: 8,
        category: activeCategory,
      });

      if (res.images && res.images.length > 0) {
        setImages((prev) => [...prev, ...res.images]);
        setPage(nextPage);
        if (res.isLooped) {
          setIsLooped(true);
        }
      }
    } catch (err) {
      console.error("Failed to fetch next image batch:", err);
    } finally {
      setLoadingMore(false);
      isFetchingRef.current = false;
    }
  }, [page, activeCategory]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && !isFetchingRef.current && !loadingInitial) {
          loadNextBatch();
        }
      },
      { rootMargin: "300px 0px 300px 0px", threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadNextBatch, loadingInitial]);

  // Image load detection for smooth fade-in
  const handleImageLoaded = (id) => {
    setLoadedImages((prev) => ({ ...prev, [id]: true }));
  };

  // Lightbox navigation
  const openLightbox = (card) => {
    setSelectedImage(card);
  };

  const closeLightbox = () => {
    setSelectedImage(null);
  };

  const handlePrevImage = useCallback(
    (e) => {
      if (e && e.stopPropagation) e.stopPropagation();
      if (!selectedImage) return;
      const currentIndex = images.findIndex((img) => img.uniqueKey === selectedImage.uniqueKey);
      const prevIndex = (currentIndex - 1 + images.length) % images.length;
      setSelectedImage(images[prevIndex]);
    },
    [selectedImage, images]
  );

  const handleNextImage = useCallback(
    (e) => {
      if (e && e.stopPropagation) e.stopPropagation();
      if (!selectedImage) return;
      const currentIndex = images.findIndex((img) => img.uniqueKey === selectedImage.uniqueKey);
      const nextIndex = (currentIndex + 1) % images.length;
      setSelectedImage(images[nextIndex]);
    },
    [selectedImage, images]
  );

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedImage) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") handlePrevImage(e);
      if (e.key === "ArrowRight") handleNextImage(e);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
        <title>Gallery | Abhyudaya Club — Event Photos & Moments from MPEC Kanpur</title>
        <meta
          name="description"
          content="Explore the interactive Pinterest masonry gallery of Abhyudaya Club at MPEC Kanpur — Cloudinary integrated, infinite scrolling event memories."
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

      {/* In-Flow Edge Header (Naturally scrolls off-screen) */}
      <header className="gallery-header-section">
        <span className="gallery-header-eyebrow">Visual Memories</span>
        <h1 className="gallery-header-title">Visual Memories & Events</h1>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Initial Loading Skeleton */}
        {loadingInitial ? (
          <GallerySkeleton count={12} />
        ) : images.length === 0 ? (
          <div className="text-center py-20 bg-white/60 rounded-3xl border border-slate-200 my-8 shadow-sm">
            <FaImages className="mx-auto text-5xl text-amber-500/60 mb-4" />
            <h3 className="text-xl font-bold text-slate-800 mb-2">No Media Found</h3>
            <p className="text-slate-500 max-w-md mx-auto mb-6">
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
          /* Pinterest Multi-Column Masonry Grid */
          <div className="gallery-masonry-grid">
            {images.map((card) => {
              const isLoaded = loadedImages[card.uniqueKey];
              return (
                <div key={card.uniqueKey} className="gallery-masonry-item">
                  <InteractiveTiltCard onClick={() => openLightbox(card)}>
                    <div className="gallery-pinterest-card">
                      {/* Clean Image / Video Tile */}
                      <div className="gallery-clean-tile">
                        {!isLoaded && (
                          <div className="absolute inset-0 bg-slate-300 animate-pulse rounded-2xl z-0" />
                        )}

                        {card.isVideo ? (
                          <div className="relative w-full">
                            <video
                              src={card.src}
                              className={`gallery-clean-media ${isLoaded ? "loaded" : ""}`}
                              onLoadedData={() => handleImageLoaded(card.uniqueKey)}
                              muted
                              playsInline
                              loop
                              autoPlay
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                              <div className="bg-amber-400 text-slate-950 p-2.5 rounded-full shadow-md">
                                <FaPlay className="ml-0.5 text-xs" />
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
                            className={`gallery-clean-media ${isLoaded ? "loaded" : ""}`}
                          />
                        )}
                      </div>

                      {/* Below-Tile Pinterest Caption Typography */}
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

        {/* Infinite Scroll Sentinel & Loader */}
        <div ref={sentinelRef} className="gallery-infinite-sentinel">
          {loadingMore && (
            <div className="flex flex-col items-center gap-3">
              <div className="gallery-loader-spinner" />
              <span className="text-xs text-amber-700 font-bold tracking-wider uppercase">
                Loading Gallery Stream...
              </span>
            </div>
          )}

          {isLooped && !loadingMore && images.length > 0 && (
            <div className="gallery-loop-badge">
              <FaSync className="animate-spin text-amber-600" />
              <span>Infinite Stream Active • Recycling Gallery Moments</span>
            </div>
          )}
        </div>
      </main>

      {/* Expanded Lightbox Modal */}
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
              {/* Close Button */}
              <button
                type="button"
                className="gallery-overlay-close-btn"
                onClick={closeLightbox}
                aria-label="Close modal"
              >
                <FaTimes />
              </button>

              {/* Main Media Stage */}
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

                {/* Left / Right Nav Arrows with 44x44px Touch Targets */}
                <button
                  type="button"
                  className="gallery-overlay-nav-btn absolute left-4 top-1/2 -translate-y-1/2"
                  onClick={handlePrevImage}
                  aria-label="Previous media"
                >
                  <FaChevronLeft />
                </button>

                <button
                  type="button"
                  className="gallery-overlay-nav-btn absolute right-4 top-1/2 -translate-y-1/2"
                  onClick={handleNextImage}
                  aria-label="Next media"
                >
                  <FaChevronRight />
                </button>
              </div>

              {/* Lightbox Sidebar Info */}
              <div className="gallery-overlay-sidebar">
                <div>
                  <span className="gallery-modal-badge">
                    {selectedImage.category}
                  </span>

                  <h2 className="gallery-modal-title">
                    {selectedImage.title}
                  </h2>

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