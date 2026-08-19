import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import BreadcrumbSchema from "../components/seo/schemas/BreadcrumbSchema.jsx";
import { getAlbumBySlug } from "../services/galleryAlbumsService.js";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaImages,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaExpand,
} from "react-icons/fa";
import "./Gallery.css";

const SITE_URL = "https://www.abhyudayaclub.in";

export default function EventAlbum() {
  const { eventSlug } = useParams();
  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Lightbox state
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [loadedImages, setLoadedImages] = useState({});
  const touchStartXRef = useRef(0);

  const breadcrumbItems = [
    { name: "Home", url: SITE_URL },
    { name: "Gallery", url: `${SITE_URL}/gallery` },
    { name: album?.title || "Event Album", url: `${SITE_URL}/gallery/${eventSlug}` },
  ];

  useEffect(() => {
    let isMounted = true;
    async function loadAlbumData() {
      try {
        setLoading(true);
        setError(null);
        const data = await getAlbumBySlug(eventSlug);
        if (isMounted) {
          if (data) {
            setAlbum(data);
          } else {
            setError("Album not found.");
          }
        }
      } catch (err) {
        console.error("Error fetching album details:", err);
        if (isMounted) setError("Failed to load event album.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (eventSlug) {
      loadAlbumData();
    }
  }, [eventSlug]);

  // Image load state tracking for smooth fade-in and shimmer removal
  const handleImageLoaded = (id) => {
    setLoadedImages((prev) => ({ ...prev, [id]: true }));
  };

  // ── Lightbox Navigation ──────────────────────────────────────────────────
  const openLightbox = (index) => setSelectedPhotoIndex(index);
  const closeLightbox = () => setSelectedPhotoIndex(null);

  const handlePrevPhoto = useCallback((e) => {
    if (e?.stopPropagation) e.stopPropagation();
    if (selectedPhotoIndex === null || !album?.photos?.length) return;
    const total = album.photos.length;
    setSelectedPhotoIndex((prev) => (prev - 1 + total) % total);
  }, [selectedPhotoIndex, album]);

  const handleNextPhoto = useCallback((e) => {
    if (e?.stopPropagation) e.stopPropagation();
    if (selectedPhotoIndex === null || !album?.photos?.length) return;
    const total = album.photos.length;
    setSelectedPhotoIndex((prev) => (prev + 1) % total);
  }, [selectedPhotoIndex, album]);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (selectedPhotoIndex === null) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") handlePrevPhoto(e);
      if (e.key === "ArrowRight") handleNextPhoto(e);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPhotoIndex, handlePrevPhoto, handleNextPhoto]);

  // Next image on-demand preloading (preloads ONLY the next 1 photo, keeping bandwidth low)
  useEffect(() => {
    if (selectedPhotoIndex !== null && album?.photos?.length > 1) {
      const nextIndex = (selectedPhotoIndex + 1) % album.photos.length;
      const nextPhoto = album.photos[nextIndex];
      if (nextPhoto?.fullSrc) {
        const img = new Image();
        img.src = nextPhoto.fullSrc;
      }
    }
  }, [selectedPhotoIndex, album]);

  // Mobile Swipe Detection for Lightbox
  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    if (Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        handlePrevPhoto();
      } else {
        handleNextPhoto();
      }
    }
  };

  if (loading) {
    return (
      <div className="gallery-page">
        <div className="album-detail-loading">
          <div className="album-detail-spinner" />
          <h2>Loading Event Album...</h2>
        </div>
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="gallery-page">
        <Helmet>
          <title>Album Not Found | Abhyudaya Club</title>
          <meta name="robots" content="noindex,follow" />
        </Helmet>
        <div className="gallery-empty-state" style={{ maxWidth: "600px", margin: "4rem auto" }}>
          <FaImages className="gallery-empty-icon" />
          <h2 className="gallery-empty-title">Album Not Found</h2>
          <p className="gallery-empty-desc">
            The event photo album you are looking for does not exist or has been removed.
          </p>
          <Link to="/gallery" className="gallery-pill-btn active">
            ← Back to Gallery
          </Link>
        </div>
      </div>
    );
  }

  const currentPhoto = selectedPhotoIndex !== null ? album.photos[selectedPhotoIndex] : null;

  return (
    <div className="gallery-page">
      <Helmet>
        <title>{`${album.title} — Event Photos & Gallery | Abhyudaya Club`}</title>
        <meta name="description" content={album.description} />
        <link rel="canonical" href={`${SITE_URL}/gallery/${album.slug}`} />
        <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1" />

        <meta property="og:type" content="article" />
        <meta property="og:title" content={`${album.title} — Photo Gallery | Abhyudaya Club`} />
        <meta property="og:description" content={album.description} />
        <meta property="og:image" content={album.coverThumbnail} />
        <meta property="og:url" content={`${SITE_URL}/gallery/${album.slug}`} />
      </Helmet>

      <BreadcrumbSchema items={breadcrumbItems} />

      {/* ── EVENT ALBUM HERO HEADER ── */}
      <section className="album-hero-section">
        <div className="album-hero-container">
          <div className="album-nav-top">
            <Link to="/gallery" className="album-back-link">
              <FaArrowLeft /> Back to All Albums
            </Link>
          </div>

          <div className="album-hero-info">
            <div className="album-hero-badges">
              <span className="album-hero-chip">{album.category}</span>
              {album.year && <span className="album-hero-year">Edition {album.year}</span>}
              <span className="album-hero-count">
                <FaImages /> {album.photoCount} Photos
              </span>
            </div>

            <h1 className="album-hero-title">{album.title}</h1>
            {album.subtitle && <p className="album-hero-subtitle">{album.subtitle}</p>}

            <div className="album-hero-meta">
              {album.date && (
                <span className="album-meta-date">
                  <FaCalendarAlt /> {album.date}
                </span>
              )}
            </div>

            <p className="album-hero-description">{album.description}</p>
          </div>
        </div>
      </section>

      {/* ── MASONRY PHOTO GRID (CSS Column Count) ── */}
      <main className="gallery-main">
        <div className="album-grid-header">
          <h2>
            Event Photography <span>({album.photos.length} Captured Moments)</span>
          </h2>
          <small>Click any image for fullscreen view with high-res zoom</small>
        </div>

        {album.photos.length === 0 ? (
          <div className="gallery-empty-state">
            <FaImages className="gallery-empty-icon" />
            <h3>No Photos Uploaded Yet</h3>
            <p>Photographs for this event album are being curated.</p>
          </div>
        ) : (
          <div className="gallery-masonry-grid">
            {album.photos.map((photo, idx) => {
              const isLoaded = loadedImages[photo.id];
              return (
                <div key={photo.id} className="gallery-masonry-item">
                  <div
                    className="gallery-photo-card"
                    onClick={() => openLightbox(idx)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open ${photo.title} in lightbox`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") openLightbox(idx);
                    }}
                  >
                    <div className="gallery-clean-tile">
                      {/* Shimmer skeleton shown until image loads */}
                      {!isLoaded && <div className="gallery-skeleton-shimmer" />}

                      <img
                        src={photo.thumbnailSrc}
                        alt={photo.title}
                        loading={idx < 4 ? "eager" : "lazy"}
                        decoding="async"
                        onLoad={() => handleImageLoaded(photo.id)}
                        onError={(e) => {
                          e.currentTarget.style.opacity = "0.6";
                          handleImageLoaded(photo.id);
                        }}
                        className={`gallery-clean-media ${isLoaded ? "loaded" : ""}`}
                      />

                      <div className="gallery-tile-hover-overlay">
                        <span className="gallery-tile-zoom-btn">
                          <FaExpand /> Expand
                        </span>
                      </div>
                    </div>

                    <div className="gallery-tile-caption">
                      <h3 className="gallery-tile-title">{photo.title}</h3>
                      {photo.description && (
                        <p className="gallery-tile-caption-desc">{photo.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Navigation Back to Gallery */}
        <div className="album-bottom-bar">
          <Link to="/gallery" className="album-bottom-back-btn">
            <FaArrowLeft /> Return to Gallery Albums
          </Link>
        </div>
      </main>

      {/* ── FULLSCREEN LIGHTBOX MODAL ── */}
      {selectedPhotoIndex !== null && currentPhoto && (
        <div
          className="gallery-overlay-backdrop"
          onClick={closeLightbox}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="gallery-overlay-modal" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button
              type="button"
              className="gallery-overlay-close-btn"
              onClick={closeLightbox}
              aria-label="Close fullscreen view"
            >
              <FaTimes />
            </button>

            {/* Media Stage */}
            <div className="gallery-overlay-image-box">
              <img
                src={currentPhoto.fullSrc}
                alt={currentPhoto.title}
                className="gallery-overlay-img"
              />

              {/* Prev / Next navigation buttons */}
              {album.photos.length > 1 && (
                <>
                  <button
                    type="button"
                    className="gallery-overlay-nav-btn gallery-nav-left"
                    onClick={handlePrevPhoto}
                    aria-label="Previous photograph"
                  >
                    <FaChevronLeft />
                  </button>

                  <button
                    type="button"
                    className="gallery-overlay-nav-btn gallery-nav-right"
                    onClick={handleNextPhoto}
                    aria-label="Next photograph"
                  >
                    <FaChevronRight />
                  </button>
                </>
              )}
            </div>

            {/* Sidebar Info Stage */}
            <div className="gallery-overlay-sidebar">
              <div>
                <div className="gallery-modal-header-meta">
                  <span className="gallery-modal-badge">{album.category}</span>
                  <span className="gallery-modal-counter">
                    {selectedPhotoIndex + 1} / {album.photos.length}
                  </span>
                </div>

                <h2 className="gallery-modal-title">{currentPhoto.title}</h2>

                {album.title && (
                  <p className="gallery-modal-album-name">
                    <FaFolderOpen /> {album.title}
                  </p>
                )}

                <p className="gallery-modal-desc">
                  {currentPhoto.description || album.description}
                </p>
              </div>

              <div className="gallery-modal-footer">
                <span>Use ← → keys or swipe to navigate • Esc to exit</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
