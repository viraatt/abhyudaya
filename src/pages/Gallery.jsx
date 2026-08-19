import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import BreadcrumbSchema from "../components/seo/schemas/BreadcrumbSchema.jsx";
import { getGalleryAlbums } from "../services/galleryAlbumsService.js";
import { FaSearch, FaFolderOpen, FaImages, FaCalendarAlt, FaLayerGroup } from "react-icons/fa";
import "./Gallery.css";

const SITE_URL = "https://www.abhyudayaclub.in";

const CATEGORIES = [
  { label: "✨ All Albums", value: "all" },
  { label: "🚩 Flagship Festivals", value: "Festivals" },
  { label: "🛠️ Hands-on Workshops", value: "Workshops" },
  { label: "🏆 Competitions & Quizzes", value: "Competitions" },
  { label: "🚀 Space & Astronomy", value: "Astronomy" },
];

const YEARS = ["all", "2026", "2025"];

export default function Gallery() {
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");

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

  // Identify featured flagship album for top spotlight banner
  const featuredAlbum = useMemo(() => {
    return albums.find((a) => a.featured) || albums[0] || null;
  }, [albums]);

  const regularAlbums = useMemo(() => {
    if (!featuredAlbum) return albums;
    return albums.filter((a) => a.slug !== featuredAlbum.slug);
  }, [albums, featuredAlbum]);

  const totalPhotosCount = useMemo(() => {
    return albums.reduce((acc, a) => acc + (a.photoCount || 0), 0);
  }, [albums]);

  const gallerySchema = {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    name: "Abhyudaya Club Event Photo Gallery",
    description:
      "Curated photography archives, workshops, flagship technical fests, and student memories of Abhyudaya Club at MPEC Kanpur.",
    url: `${SITE_URL}/gallery`,
    image: albums.slice(0, 5).map((a) => a.coverThumbnail),
  };

  return (
    <div className="gallery-page">
      <Helmet>
        <title>Event Albums &amp; Photo Gallery | Abhyudaya Club — MPEC Kanpur</title>
        <meta
          name="description"
          content="Explore high-resolution event albums, flagship festivals, robotics arenas, aeromodelling workshops, and astronomy fests from Abhyudaya Club at MPEC Kanpur."
        />
        <link rel="canonical" href={`${SITE_URL}/gallery`} />
        <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1" />

        <meta property="og:type" content="website" />
        <meta property="og:title" content="Event Albums & Photo Gallery | Abhyudaya Club" />
        <meta
          property="og:description"
          content="Explore curated event albums, workshops, and flagship fest photography of Abhyudaya Club at MPEC Kanpur."
        />
        <meta property="og:url" content={`${SITE_URL}/gallery`} />
        <meta property="og:image" content={`${SITE_URL}/og-image.png`} />

        <script type="application/ld+json">
          {JSON.stringify(gallerySchema)}
        </script>
      </Helmet>

      <BreadcrumbSchema items={breadcrumbItems} />

      {/* ── GALLERY HEADER & SEARCH BAR ── */}
      <header className="gallery-header-section">
        <span className="gallery-header-eyebrow">Photography Archive</span>
        <h1 className="gallery-header-title">Visual Memories &amp; Events</h1>
        <p className="gallery-header-subtitle">
          Explore curated moments, workshops, hackathons, and flagship festivals captured by Abhyudaya Club at MPEC Kanpur.
        </p>

        {/* Search & Filter Bar */}
        <div className="gallery-search-filter-wrapper">
          <div className="gallery-search-box">
            <FaSearch className="gallery-search-icon" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search albums, fests, workshops..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="gallery-search-input"
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

          {/* Year Pills */}
          <div className="gallery-year-filter">
            <span className="gallery-filter-label">Year:</span>
            {YEARS.map((yr) => (
              <button
                key={yr}
                type="button"
                className={`gallery-pill-btn ${selectedYear === yr ? "active" : ""}`}
                onClick={() => setSelectedYear(yr)}
              >
                {yr === "all" ? "All" : yr}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills */}
        <div className="gallery-category-bar" role="tablist" aria-label="Album Categories">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              role="tab"
              aria-selected={selectedCategory === cat.value}
              className={`gallery-category-tab ${selectedCategory === cat.value ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat.value)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Gallery Stats Strip */}
        <div className="gallery-stats-counter">
          <span>📁 {albums.length} Event {albums.length === 1 ? "Album" : "Albums"}</span>
          <span>•</span>
          <span>📸 {totalPhotosCount}+ Captured Moments</span>
        </div>
      </header>

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
              No albums matched your current search or category filter. Try clearing your filters.
            </p>
            <button
              type="button"
              className="gallery-pill-btn active"
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
          <div className="gallery-albums-container">
            {/* ── FEATURED SPOTLIGHT ALBUM BANNER ── */}
            {featuredAlbum && selectedCategory === "all" && !searchQuery && (
              <div className="gallery-spotlight-section">
                <div className="gallery-spotlight-card">
                  <div className="spotlight-media-wrapper">
                    <img
                      src={featuredAlbum.coverThumbnail}
                      alt={featuredAlbum.title}
                      className="spotlight-image"
                      loading="eager"
                      fetchpriority="high"
                      decoding="async"
                    />
                    <div className="spotlight-badge-floating">
                      <span className="spotlight-chip">⭐ Featured Festival</span>
                      <span className="spotlight-photo-count">
                        <FaImages /> {featuredAlbum.photoCount} Photos
                      </span>
                    </div>
                  </div>

                  <div className="spotlight-content">
                    <span className="album-category-badge">{featuredAlbum.category}</span>
                    <h2 className="spotlight-title">{featuredAlbum.title}</h2>
                    <p className="spotlight-date">
                      <FaCalendarAlt /> {featuredAlbum.date}
                    </p>
                    <p className="spotlight-desc">{featuredAlbum.description}</p>
                    <Link
                      to={`/gallery/${featuredAlbum.slug}`}
                      className="spotlight-cta-btn"
                    >
                      <FaFolderOpen /> Explore Album ({featuredAlbum.photoCount} Photos) →
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* ── ALL EVENT ALBUMS GRID ── */}
            <div className="gallery-section-heading">
              <h2 className="gallery-grid-title">
                <FaLayerGroup /> {selectedCategory === "all" ? "All Event Albums" : `${selectedCategory} Albums`}
              </h2>
              <span className="gallery-grid-count">{albums.length} {albums.length === 1 ? "Album" : "Albums"}</span>
            </div>

            <div className="gallery-albums-grid">
              {(selectedCategory === "all" && !searchQuery ? regularAlbums : albums).map((album) => (
                <article key={album.slug} className="album-card">
                  <Link to={`/gallery/${album.slug}`} className="album-card-link" aria-label={`View ${album.title} album`}>
                    <div className="album-card-cover-wrap">
                      <img
                        src={album.coverThumbnail}
                        alt={`${album.title} album cover`}
                        loading="lazy"
                        decoding="async"
                        className="album-card-cover"
                        onError={(e) => {
                          // Graceful fallback if Cloudinary or external image fails
                          e.currentTarget.style.opacity = "0.7";
                        }}
                      />
                      <div className="album-card-overlay">
                        <span className="album-hover-explore">
                          <FaFolderOpen /> Open Album →
                        </span>
                      </div>
                      <span className="album-count-badge">
                        <FaImages /> {album.photoCount}
                      </span>
                    </div>

                    <div className="album-card-info">
                      <div className="album-meta-top">
                        <span className="album-category-chip">{album.category}</span>
                        {album.date && (
                          <span className="album-date-label">
                            {album.date.split(" ").slice(-2).join(" ")}
                          </span>
                        )}
                      </div>

                      <h3 className="album-card-title">{album.title}</h3>
                      <p className="album-card-desc">{album.description}</p>

                      <div className="album-card-footer">
                        <span className="album-view-action">
                          View Album →
                        </span>
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}