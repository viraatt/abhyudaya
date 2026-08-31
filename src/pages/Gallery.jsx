import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import BreadcrumbSchema from "../components/seo/schemas/BreadcrumbSchema.jsx";
import {
  getGalleryAlbums,
  EDITORIAL_MOMENTS,
  HERO_COLLAGE_PHOTOS,
  getRandomHighlightPhoto,
} from "../services/galleryAlbumsService.js";
import {
  FaSearch,
  FaFolderOpen,
  FaImages,
  FaCalendarAlt,
  FaTimes,
  FaMagic,
  FaArrowRight,
  FaChevronRight,
} from "react-icons/fa";
import "./Gallery.css";

const SITE_URL = "https://www.abhyudayaclub.in";

const PRIMARY_CATEGORIES = [
  { label: "All", value: "all" },
  { label: "Festivals", value: "Festivals" },
  { label: "Workshops", value: "Workshops" },
  { label: "Competitions", value: "Competitions" },
  { label: "Talks", value: "Talks" },
  { label: "Activities", value: "Activities" },
];

const YEAR_FILTERS = ["all", "2026", "2025", "2024"];

export default function Gallery() {
  const navigate = useNavigate();
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");

  // Surprise Me Lightbox State
  const [surprisePhoto, setSurprisePhoto] = useState(null);
  const [surpriseLoading, setSurpriseLoading] = useState(false);

  const breadcrumbItems = [
    { name: "Home", url: SITE_URL },
    { name: "Gallery", url: `${SITE_URL}/gallery` },
  ];

  useEffect(() => {
    let isMounted = true;
    async function loadAlbums() {
      try {
        setLoading(true);
        const data = await getGalleryAlbums({
          category: selectedCategory,
          search: searchQuery,
          year: selectedYear,
        });
        if (isMounted) {
          setAlbums(data);
        }
      } catch (err) {
        console.error("Failed to load gallery albums:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadAlbums();
    return () => { isMounted = false; };
  }, [selectedCategory, searchQuery, selectedYear]);

  // Featured Album for Spotlight Section
  const featuredAlbum = useMemo(() => {
    return albums.find((a) => a.featured) || albums[0] || null;
  }, [albums]);

  const regularAlbums = useMemo(() => {
    if (!featuredAlbum || selectedCategory !== "all" || searchQuery) return albums;
    return albums.filter((a) => a.slug !== featuredAlbum.slug);
  }, [albums, featuredAlbum, selectedCategory, searchQuery]);

  const totalPhotosCount = useMemo(() => {
    return albums.reduce((acc, a) => acc + (a.photoCount || 0), 0);
  }, [albums]);

  // Handle Surprise Me Click
  const handleSurpriseMe = useCallback(async () => {
    try {
      setSurpriseLoading(true);
      const randomPhoto = await getRandomHighlightPhoto();
      if (randomPhoto) {
        setSurprisePhoto(randomPhoto);
      }
    } catch (err) {
      console.error("Surprise Me fetch error:", err);
    } finally {
      setSurpriseLoading(false);
    }
  }, []);

  // Keyboard navigation for Surprise Me Lightbox
  useEffect(() => {
    if (!surprisePhoto) return;
    const onKey = (e) => {
      if (e.key === "Escape") setSurprisePhoto(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [surprisePhoto]);

  const gallerySchema = {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    name: "Abhyudaya Club Event Photography Archive",
    description:
      "A digital annual album of Abhyudaya Club memories, workshops, hackathons, and celebrations at MPEC Kanpur.",
    url: `${SITE_URL}/gallery`,
    image: albums.slice(0, 5).map((a) => a.coverThumbnail),
  };

  return (
    <div className="gallery-page">
      <Helmet>
        <title>Photography Archive &amp; Event Albums | Abhyudaya Club</title>
        <meta
          name="description"
          content="Explore the digital memory archive of Abhyudaya Club — curated annual albums of TechBloom, Antariksh Spardha, workshops, robotics, and celebrations at MPEC Kanpur."
        />
        <link rel="canonical" href={`${SITE_URL}/gallery`} />
        <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1" />

        <meta property="og:type" content="website" />
        <meta property="og:title" content="Photography Archive & Event Albums | Abhyudaya Club" />
        <meta
          property="og:description"
          content="Explore the digital annual album of Abhyudaya Club memories, events, and workshops at MPEC Kanpur."
        />
        <meta property="og:url" content={`${SITE_URL}/gallery`} />
        <meta property="og:image" content={`${SITE_URL}/og-image.png`} />

        <script type="application/ld+json">
          {JSON.stringify(gallerySchema)}
        </script>
      </Helmet>

      <BreadcrumbSchema items={breadcrumbItems} />

      {/* ── SECTION 1: TWO-COLUMN EDITORIAL HERO ── */}
      <section className="gallery-editorial-hero">
        <div className="gallery-hero-container">
          {/* Left Column: Typography, Narrative & Search */}
          <div className="gallery-hero-text-col">
            <span className="gallery-hero-eyebrow">PHOTOGRAPHY ARCHIVE</span>
            
            <h1 className="gallery-hero-title">
              Visual Memories <span className="hero-gold-accent">&amp; Events</span>
            </h1>

            <p className="gallery-hero-lede">
              Explore moments, workshops, competitions, and celebrations captured by Abhyudaya Club — our digital annual album of curiosity, creation, and community at MPEC Kanpur.
            </p>

            {/* Search Bar & Surprise Me Trigger */}
            <div className="gallery-hero-actions">
              <div className="gallery-hero-search-box">
                <FaSearch className="gallery-search-icon" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Search albums, events, workshops..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="gallery-hero-search-input"
                  aria-label="Search event albums"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="gallery-search-clear"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                type="button"
                className="gallery-surprise-btn"
                onClick={handleSurpriseMe}
                disabled={surpriseLoading}
                title="Open a random memory from our archive"
              >
                <FaMagic className={surpriseLoading ? "animate-spin" : ""} />
                <span>{surpriseLoading ? "Finding..." : "✦ Surprise Me"}</span>
              </button>
            </div>

            {/* SECTION 4: SUBTLE METADATA LINE */}
            <div className="gallery-meta-stat-line">
              <span>{albums.length} Event Albums</span>
              <span className="meta-dot">·</span>
              <span>{totalPhotosCount}+ Captured Moments</span>
              <span className="meta-dot">·</span>
              <span>Annual Archive</span>
            </div>
          </div>

          {/* Right Column: Curated Photography Wall Collage */}
          <div className="gallery-hero-collage-col" aria-label="Featured Photography Collage">
            <div className="collage-grid">
              <div className="collage-card dominant">
                <img
                  src={HERO_COLLAGE_PHOTOS[0].src}
                  alt={HERO_COLLAGE_PHOTOS[0].title}
                  className="collage-img"
                  loading="eager"
                  fetchPriority="high"
                />
                <div className="collage-overlay">
                  <span className="collage-badge">{HERO_COLLAGE_PHOTOS[0].category}</span>
                  <p className="collage-caption">{HERO_COLLAGE_PHOTOS[0].title}</p>
                </div>
              </div>

              <div className="collage-card sub-top">
                <img
                  src={HERO_COLLAGE_PHOTOS[1].src}
                  alt={HERO_COLLAGE_PHOTOS[1].title}
                  className="collage-img"
                  loading="eager"
                />
                <div className="collage-overlay mini">
                  <span className="collage-badge mini">{HERO_COLLAGE_PHOTOS[1].category}</span>
                </div>
              </div>

              <div className="collage-card sub-bottom">
                <img
                  src={HERO_COLLAGE_PHOTOS[2].src}
                  alt={HERO_COLLAGE_PHOTOS[2].title}
                  className="collage-img"
                  loading="eager"
                />
                <div className="collage-overlay mini">
                  <span className="collage-badge mini">{HERO_COLLAGE_PHOTOS[2].category}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: SIMPLIFIED FILTERS BAR ── */}
      <section className="gallery-filter-strip-section">
        <div className="gallery-filter-strip-container">
          {/* Primary Category Filters */}
          <div className="gallery-category-pill-group" role="tablist" aria-label="Event Categories">
            {PRIMARY_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                role="tab"
                aria-selected={selectedCategory === cat.value}
                className={`gallery-filter-pill ${selectedCategory === cat.value ? "active" : ""}`}
                onClick={() => setSelectedCategory(cat.value)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Secondary Year Filters */}
          <div className="gallery-year-pill-group" aria-label="Filter by Year">
            <span className="year-group-label">Year:</span>
            {YEAR_FILTERS.map((yr) => (
              <button
                key={yr}
                type="button"
                className={`gallery-year-pill ${selectedYear === yr ? "active" : ""}`}
                onClick={() => setSelectedYear(yr)}
              >
                {yr === "all" ? "All" : yr}
              </button>
            ))}
          </div>
        </div>
      </section>

      <main className="gallery-main">
        {loading ? (
          /* SKELETON LOADING STATE */
          <div className="gallery-albums-grid">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={`skel-alb-${idx}`} className="album-card-skeleton">
                <div className="album-skel-cover" />
                <div className="album-skel-body">
                  <div className="album-skel-badge" />
                  <div className="album-skel-title" />
                  <div className="album-skel-text" />
                </div>
              </div>
            ))}
          </div>
        ) : albums.length === 0 ? (
          /* EMPTY STATE */
          <div className="gallery-empty-state">
            <FaImages className="gallery-empty-icon" />
            <h3 className="gallery-empty-title">No Event Albums Found</h3>
            <p className="gallery-empty-desc">
              No memory albums match your search query or category filters.
            </p>
            <button
              type="button"
              className="gallery-filter-pill active"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setSelectedYear("all");
              }}
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="gallery-sections-wrapper">
            {/* ── SECTION 5: FEATURED ALBUM (Editorial Magazine 60/40 Split) ── */}
            {featuredAlbum && selectedCategory === "all" && !searchQuery && selectedYear === "all" && (
              <section className="featured-album-spotlight" aria-label="Featured Annual Album">
                <div className="featured-spotlight-card">
                  {/* 60% Left Cover Image */}
                  <div className="featured-media-stage">
                    <img
                      src={featuredAlbum.coverThumbnail}
                      alt={featuredAlbum.title}
                      className="featured-cover-img"
                      loading="eager"
                    />
                    <div className="featured-floating-tag">
                      <span className="tag-gold-chip">⭐ FEATURED ALBUM</span>
                      <span className="tag-photo-count">
                        <FaImages /> {featuredAlbum.photoCount} Photos
                      </span>
                    </div>
                  </div>

                  {/* 40% Right Deep Navy Panel */}
                  <div className="featured-info-panel">
                    <div className="featured-meta-header">
                      <span className="featured-cat-tag">{featuredAlbum.category}</span>
                      <span className="featured-date-tag">
                        <FaCalendarAlt /> {featuredAlbum.date}
                      </span>
                    </div>

                    <h2 className="featured-title">{featuredAlbum.title}</h2>
                    <p className="featured-lede">
                      A celebration of technology, creativity, and student leadership — capturing the live energy and innovation of our flagship festival.
                    </p>

                    <Link
                      to={`/gallery/${featuredAlbum.slug}`}
                      className="featured-explore-btn"
                    >
                      <FaFolderOpen /> Explore Album ({featuredAlbum.photoCount} Photos) <FaArrowRight className="btn-arrow" />
                    </Link>
                  </div>
                </div>
              </section>
            )}

            {/* ── SECTION 6: EVENT ALBUMS DIRECTORY ── */}
            <section className="gallery-albums-directory" aria-label="All Event Albums">
              <div className="gallery-directory-header">
                <div>
                  <h2 className="directory-heading">Explore Event Albums</h2>
                  <p className="directory-subtext">Browse the moments that shaped our year.</p>
                </div>
                <span className="directory-count-chip">
                  {regularAlbums.length} {regularAlbums.length === 1 ? "Album" : "Albums"}
                </span>
              </div>

              <div className="gallery-albums-grid">
                {regularAlbums.map((album) => (
                  <article key={album.slug} className="album-card">
                    <Link
                      to={`/gallery/${album.slug}`}
                      className="album-card-link"
                      aria-label={`Explore ${album.title} album`}
                    >
                      <div className="album-card-cover-wrap">
                        <img
                          src={album.coverThumbnail}
                          alt={`${album.title} cover`}
                          loading="lazy"
                          decoding="async"
                          className="album-card-cover"
                          onError={(e) => {
                            e.currentTarget.style.opacity = "0.7";
                          }}
                        />
                        <div className="album-card-hover-overlay">
                          <span className="album-hover-pill">
                            <FaFolderOpen /> Explore Album →
                          </span>
                        </div>
                        <span className="album-photo-count-badge">
                          <FaImages /> {album.photoCount} Photos
                        </span>
                      </div>

                      <div className="album-card-body">
                        <div className="album-body-meta">
                          <span className="album-cat-label">{album.category}</span>
                          {album.date && (
                            <span className="album-date-text">{album.date}</span>
                          )}
                        </div>

                        <h3 className="album-title-text">{album.title}</h3>
                        <p className="album-desc-text">{album.description}</p>

                        <div className="album-card-bottom">
                          <span className="album-cta-text">
                            Explore Album <FaChevronRight className="cta-icon" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
            </section>

            {/* ── SECTION 7: MOMENTS THAT DEFINE US (Editorial 3-Photo Story Strip) ── */}
            {selectedCategory === "all" && !searchQuery && (
              <section className="moments-define-section" aria-label="Moments That Define Us">
                <div className="moments-section-header">
                  <span className="moments-eyebrow">OUR CORE JOURNEY</span>
                  <h2 className="moments-title">Moments That Define Us</h2>
                  <p className="moments-subtitle">
                    The core experiences, collaborations, and milestones that shape the student spirit at Abhyudaya.
                  </p>
                </div>

                <div className="moments-grid">
                  {EDITORIAL_MOMENTS.map((moment) => (
                    <div key={moment.id} className="moment-card">
                      <div className="moment-image-box">
                        <img
                          src={moment.image}
                          alt={moment.title}
                          loading="lazy"
                          decoding="async"
                          className="moment-image"
                        />
                        <div className="moment-badge-tag">
                          <span>{moment.tagline}</span>
                        </div>
                      </div>

                      <div className="moment-content">
                        <span className="moment-event-label">{moment.subtitle}</span>
                        <h3 className="moment-heading">{moment.title}</h3>
                        <p className="moment-desc">{moment.description}</p>
                        <Link
                          to={`/gallery/${moment.albumSlug}`}
                          className="moment-link"
                        >
                          View {moment.subtitle} Album →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* ── SURPRISE ME LIGHTBOX MODAL ── */}
      {surprisePhoto && (
        <div
          className="gallery-overlay-backdrop"
          onClick={() => setSurprisePhoto(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Surprise Memory Lightbox"
        >
          <div className="gallery-overlay-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="gallery-overlay-close-btn"
              onClick={() => setSurprisePhoto(null)}
              aria-label="Close memory view"
            >
              <FaTimes />
            </button>

            <div className="gallery-overlay-image-box">
              <img
                src={surprisePhoto.fullSrc}
                alt={surprisePhoto.title}
                className="gallery-overlay-img"
              />
            </div>

            <div className="gallery-overlay-sidebar">
              <div>
                <div className="gallery-modal-header-meta">
                  <span className="gallery-modal-badge">{surprisePhoto.albumCategory || "Memory"}</span>
                  <span className="gallery-surprise-tag">✦ Random Discovery</span>
                </div>

                <h2 className="gallery-modal-title">{surprisePhoto.title}</h2>

                <p className="gallery-modal-album-name">
                  <FaFolderOpen /> From: {surprisePhoto.albumTitle}
                </p>

                <p className="gallery-modal-desc">
                  {surprisePhoto.description || "A curated snapshot from the Abhyudaya Club photography archive."}
                </p>
              </div>

              <div className="gallery-surprise-footer">
                <button
                  type="button"
                  className="surprise-explore-album-btn"
                  onClick={() => {
                    setSurprisePhoto(null);
                    navigate(`/gallery/${surprisePhoto.albumSlug}`);
                  }}
                >
                  Explore Complete Album →
                </button>
                <button
                  type="button"
                  className="surprise-shuffle-btn"
                  onClick={handleSurpriseMe}
                >
                  ✦ Shuffle Another
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
