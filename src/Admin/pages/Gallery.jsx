import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import "./style/admin.css";
import "./Gallery.css";
import {
  getGalleryItems,
  addGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
} from "./services/galleryService";
import { invalidateGalleryCache } from "../../services/galleryAlbumsService";
import { GALLERY_CATEGORIES, slugify, yearFromDate } from "../../utils/galleryConstants";

const EMPTY_FORM = {
  title: "",
  subtitle: "",
  category: "Festivals",
  date: new Date().toISOString().split("T")[0],
  year: new Date().getFullYear(),
  description: "",
  slug: "",
  featured: false,
  status: "Published",
  coverImage: "",
  yearManuallySet: false,
};

export default function Gallery() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeStatus, setActiveStatus] = useState("All");

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [photos, setPhotos] = useState([]); // [{ file?, src?, title, description, preview? }]
  const [slugTouched, setSlugTouched] = useState(false);

  /* ── Data Loading ─────────────────────────────────────────── */
  const loadItems = async () => {
    try {
      setLoading(true);
      const data = await getGalleryItems();
      setItems(data);
    } catch (err) {
      console.error(err);
      alert("Failed to load gallery albums.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  /* ── Form Reset ───────────────────────────────────────────── */
  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setPhotos([]);
    setEditingItem(null);
    setSlugTouched(false);
  };

  /* ── Open Drawer ──────────────────────────────────────────── */
  const handleOpenDrawer = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        title: item.title || "",
        subtitle: item.subtitle || "",
        category: item.category || "Festivals",
        date: item.date || new Date().toISOString().split("T")[0],
        year: item.year || yearFromDate(item.date),
        description: item.description || "",
        slug: item.slug || "",
        featured: Boolean(item.featured),
        status: item.status || "Published",
        coverImage: item.coverImage || "",
        yearManuallySet: true,
      });
      setPhotos(
        (item.photos || []).map((p) => ({
          id: p.id,
          src: p.src || p.rawSrc || "",
          title: p.title || "",
          description: p.description || "",
          preview: p.src || p.rawSrc || "",
        }))
      );
      setSlugTouched(true);
    } else {
      resetForm();
    }
    setShowDrawer(true);
  };

  /* ── Form Change Handlers ─────────────────────────────────── */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;

    setFormData((prev) => {
      const next = { ...prev, [name]: newValue };

      // Auto-generate slug from title unless user has manually edited it
      if (name === "title" && !slugTouched) {
        next.slug = slugify(value);
      }

      // Keep year in sync with date unless user manually changed year
      if (name === "date" && !prev.yearManuallySet) {
        next.year = yearFromDate(value);
      }

      return next;
    });
  };

  const handleSlugChange = (e) => {
    setSlugTouched(true);
    setFormData((prev) => ({
      ...prev,
      slug: slugify(e.target.value),
    }));
  };

  const handleYearChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      year: Number(e.target.value) || new Date().getFullYear(),
      yearManuallySet: true,
    }));
  };

  /* ── Photo Handlers ───────────────────────────────────────── */
  const handlePhotoFiles = (e) => {
    const files = Array.from(e.target.files || []);
    const newPhotos = files.map((file) => ({
      file,
      title: file.name.replace(/\.[^.]+$/, ""),
      description: "",
      preview: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...newPhotos]);
    e.target.value = "";
  };

  const handlePhotoChange = (index, field, value) => {
    setPhotos((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  };

  const handleRemovePhoto = (index) => {
    setPhotos((prev) => {
      const next = [...prev];
      if (next[index]?.preview?.startsWith("blob:")) {
        URL.revokeObjectURL(next[index].preview);
      }
      next.splice(index, 1);
      return next;
    });
  };

  const handleSetCover = (index) => {
    const photo = photos[index];
    if (!photo) return;
    setFormData((prev) => ({
      ...prev,
      coverImage: photo.src || photo.preview || "",
      coverImageIndex: index,
    }));
  };

  /* ── Submit ───────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert("Album title is required.");
      return;
    }

    if (photos.length === 0) {
      alert("Please add at least one photo to the album.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        coverImageIndex: formData.coverImageIndex ?? 0,
        photos: photos.map((p) => ({
          file: p.file || undefined,
          src: p.src || p.preview || "",
          title: p.title || "",
          description: p.description || "",
        })),
      };

      if (editingItem) {
        await updateGalleryItem(editingItem.id, payload);
        alert("Album updated!");
      } else {
        await addGalleryItem(payload);
        alert("Album created successfully!");
      }

      invalidateGalleryCache();
      setShowDrawer(false);
      resetForm();
      await loadItems();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to save album.");
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete ───────────────────────────────────────────────── */
  const handleDelete = async (item) => {
    if (!window.confirm(`Delete album "${item.title}"? This cannot be undone.`)) return;
    try {
      await deleteGalleryItem(item.id);
      invalidateGalleryCache();
      await loadItems();
    } catch (err) {
      console.error(err);
      alert(err.message || "Delete failed.");
    }
  };

  /* ── Filter Logic ─────────────────────────────────────────── */
  const categories = ["All", ...GALLERY_CATEGORIES];
  const statuses = ["All", "Published", "Draft"];

  const filteredItems = items.filter((item) => {
    const catMatch = activeCategory === "All" || item.category === activeCategory;
    const statusMatch = activeStatus === "All" || item.status === activeStatus;
    return catMatch && statusMatch;
  });

  /* ── Computed Stats ───────────────────────────────────────── */
  const totalAlbums = items.length;
  const publishedCount = items.filter((i) => i.status === "Published").length;
  const draftCount = items.filter((i) => i.status === "Draft").length;
  const featuredCount = items.filter((i) => i.featured).length;

  /* ── Helpers ──────────────────────────────────────────────── */
  const isCover = (photo) =>
    formData.coverImage && formData.coverImage === (photo.src || photo.preview);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const [, , d] = dateStr.split("-");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const [y, m] = dateStr.split("-");
    return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
  };

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Topbar />

        <div className="gm-page">

          {/* ── Page Header ───────────────────────────────── */}
          <div className="gm-page-header">
            <div className="gm-page-header__left">
              <h1>Gallery Management</h1>
              <p>Manage event albums, photographs, and published gallery content.</p>
            </div>
            <button className="gm-btn-create" onClick={() => handleOpenDrawer()}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              Create Album
            </button>
          </div>

          {/* ── Stats Row ─────────────────────────────────── */}
          <div className="gm-stats">
            <div className="gm-stat">
              <div className="gm-stat__value">{totalAlbums}</div>
              <div className="gm-stat__label">Total Albums</div>
            </div>
            <div className="gm-stat gm-stat--green">
              <div className="gm-stat__value">{publishedCount}</div>
              <div className="gm-stat__label">Published</div>
            </div>
            <div className="gm-stat gm-stat--orange">
              <div className="gm-stat__value">{draftCount}</div>
              <div className="gm-stat__label">Drafts</div>
            </div>
            <div className="gm-stat gm-stat--gold">
              <div className="gm-stat__value">{featuredCount}</div>
              <div className="gm-stat__label">Featured</div>
            </div>
          </div>

          {/* ── Cloudinary Tip Banner ──────────────────────── */}
          <div className="gm-info-banner">
            <span className="gm-info-banner__icon">💡</span>
            <div>
              <strong>Cloudinary Free Plan:</strong> Recommended photo size is{" "}
              <strong>1600–2400 px</strong> (JPEG/WebP under 2 MB). This conserves
              monthly credits while ensuring sharp display on all devices.
            </div>
          </div>

          {/* ── Toolbar: Category + Status Pills ──────────── */}
          <div className="gm-toolbar">
            <span className="gm-toolbar__label">Category</span>
            {categories.map((cat) => (
              <button
                key={cat}
                className={`gm-pill gm-pill--cat${activeCategory === cat ? " gm-pill--active" : ""}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}

            <div className="gm-toolbar__divider" />

            <span className="gm-toolbar__label">Status</span>
            {statuses.map((st) => (
              <button
                key={st}
                className={`gm-pill${activeStatus === st ? " gm-pill--active" : ""}`}
                onClick={() => setActiveStatus(st)}
              >
                {st}
              </button>
            ))}
          </div>

          {/* ── Album List ────────────────────────────────── */}
          {loading ? (
            <div className="gm-loading">
              <div className="gm-loading__spinner" />
              Loading gallery albums…
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="gm-empty">
              <span className="gm-empty__icon">🖼️</span>
              <h3>No Albums Found</h3>
              <p>Create photo albums to showcase in the public gallery.</p>
              <button className="gm-btn-create" onClick={() => handleOpenDrawer()}>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{width:16,height:16,stroke:"#fff",strokeWidth:2.5}}>
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
                Create Album
              </button>
            </div>
          ) : (
            <div className="gm-album-grid">
              {filteredItems.map((item) => (
                <div className="gm-album-card" key={item.id}>

                  {/* Thumbnail */}
                  <div className="gm-album-card__thumb">
                    {item.coverImage || item.photos?.[0]?.src ? (
                      <img
                        src={item.coverImage || item.photos[0].src}
                        alt={item.title}
                      />
                    ) : (
                      <div className="gm-album-card__thumb-empty">🖼️</div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="gm-album-card__body">
                    <div className="gm-album-card__top">
                      <div>
                        <h3 className="gm-album-card__title">{item.title}</h3>
                        {item.subtitle && (
                          <p className="gm-album-card__subtitle">{item.subtitle}</p>
                        )}
                      </div>
                      <div className="gm-album-card__badges">
                        {item.featured && (
                          <span className="gm-badge gm-badge--featured">⭐ Featured</span>
                        )}
                        <span
                          className={`gm-badge gm-badge--dot ${
                            item.status === "Published"
                              ? "gm-badge--published"
                              : "gm-badge--draft"
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    </div>

                    <div className="gm-album-card__meta">
                      <span className="gm-badge gm-badge--category">{item.category}</span>
                      {item.date && (
                        <span className="gm-album-card__meta-item">
                          📅 {formatDate(item.date)}
                        </span>
                      )}
                      <span className="gm-album-card__meta-item">
                        🖼 {item.photos?.length || 0} photo{item.photos?.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {item.description && (
                      <p
                        style={{
                          fontSize: "13px",
                          color: "var(--gm-muted)",
                          margin: "4px 0 0",
                          lineHeight: 1.5,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="gm-album-card__actions">
                    <button
                      className="gm-btn-edit"
                      onClick={() => handleOpenDrawer(item)}
                      title="Edit album"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="gm-btn-delete"
                      onClick={() => handleDelete(item)}
                      title="Delete album"
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════
            ALBUM DRAWER
            ════════════════════════════════════════════════════ */}
        {showDrawer && (
          <>
            {/* Overlay */}
            <div
              className="drawer-overlay"
              onClick={() => setShowDrawer(false)}
            />

            {/* Drawer panel */}
            <div className="gm-drawer">

              {/* Header */}
              <div className="gm-drawer__header">
                <div className="gm-drawer__header-text">
                  <h2>{editingItem ? "Edit Album" : "Create Album"}</h2>
                  <p>
                    {editingItem
                      ? "Update album information and media."
                      : "Build a new photo album for the public gallery."}
                  </p>
                </div>
                <button
                  className="gm-drawer__close"
                  onClick={() => setShowDrawer(false)}
                  aria-label="Close drawer"
                >
                  ✕
                </button>
              </div>

              {/* Body — scrollable form */}
              <form
                className="gm-drawer__body"
                onSubmit={handleSubmit}
                id="gm-album-form"
              >

                {/* ── Section 1: Album Information ─────────── */}
                <div className="gm-section">
                  <div className="gm-section__heading">Album Information</div>

                  <div className="gm-field">
                    <label>
                      Album Title
                      <span className="gm-field__required"> *</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="e.g. TechBloom 2.0"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="gm-field">
                    <label>Subtitle</label>
                    <input
                      type="text"
                      name="subtitle"
                      value={formData.subtitle}
                      onChange={handleChange}
                      placeholder="e.g. Flagship Technical Festival"
                    />
                  </div>

                  <div className="gm-field">
                    <label>Slug</label>
                    <input
                      type="text"
                      name="slug"
                      value={formData.slug}
                      onChange={handleSlugChange}
                      placeholder="auto-generated from title"
                    />
                    {formData.slug && (
                      <span className="gm-field__url-preview">
                        /gallery/{formData.slug}
                      </span>
                    )}
                    {!formData.slug && (
                      <span className="gm-field__hint">
                        Leave blank to auto-generate from title
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Section 2: Classification ─────────────── */}
                <div className="gm-section">
                  <div className="gm-section__heading">Classification</div>

                  <div className="gm-field">
                    <label>Category</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                    >
                      {GALLERY_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="gm-field-row">
                    <div className="gm-field">
                      <label>Date</label>
                      <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="gm-field">
                      <label>Year</label>
                      <input
                        type="number"
                        name="year"
                        value={formData.year}
                        onChange={handleYearChange}
                        min="2000"
                        max="2100"
                      />
                    </div>
                  </div>
                </div>

                {/* ── Section 3: Description ────────────────── */}
                <div className="gm-section">
                  <div className="gm-section__heading">Description</div>

                  <div className="gm-field">
                    <label>Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Details about this event album…"
                      rows={4}
                    />
                  </div>
                </div>

                {/* ── Section 4: Publishing ─────────────────── */}
                <div className="gm-section">
                  <div className="gm-section__heading">Publishing</div>

                  <div className="gm-toggle-group">
                    {/* Featured toggle */}
                    <div className="gm-toggle-row">
                      <div className="gm-toggle-row__info">
                        <h4>⭐ Featured Album</h4>
                        <p>Highlight this album on the public gallery homepage.</p>
                      </div>
                      <label className="gm-switch">
                        <input
                          type="checkbox"
                          name="featured"
                          checked={formData.featured}
                          onChange={handleChange}
                        />
                        <span className="gm-switch__track" />
                      </label>
                    </div>

                    {/* Published toggle */}
                    <div className="gm-toggle-row">
                      <div className="gm-toggle-row__info">
                        <h4>● Published</h4>
                        <p>Make this album visible to visitors on the public gallery.</p>
                      </div>
                      <label className="gm-switch">
                        <input
                          type="checkbox"
                          name="status"
                          checked={formData.status === "Published"}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              status: e.target.checked ? "Published" : "Draft",
                            }))
                          }
                        />
                        <span className="gm-switch__track" />
                      </label>
                    </div>
                  </div>
                </div>

                {/* ── Section 5: Photos ─────────────────────── */}
                <div className="gm-section">
                  <div className="gm-section__heading">
                    Photos
                    <span className="gm-field__required" style={{textTransform:"none",letterSpacing:0,fontSize:13,marginLeft:-4}}> *</span>
                  </div>

                  {/* Upload Zone */}
                  <div className="gm-upload-zone">
                    <input
                      className="gm-upload-zone__input"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoFiles}
                      title="Select photos to upload"
                    />
                    <span className="gm-upload-zone__icon">📷</span>
                    <h4>Drag & drop photos here</h4>
                    <p>
                      or{" "}
                      <span className="gm-upload-zone__browse">browse from your computer</span>
                    </p>
                    <div className="gm-upload-zone__formats">
                      JPG · PNG · WEBP · GIF
                    </div>
                  </div>

                  {/* Photo Grid */}
                  {photos.length > 0 && (
                    <div className="gm-photo-grid">
                      {photos.map((photo, index) => {
                        const coverPhoto = isCover(photo);
                        return (
                          <div
                            key={index}
                            className={`gm-photo-item${coverPhoto ? " gm-photo-item--cover" : ""}`}
                          >
                            {/* Thumbnail */}
                            <div className="gm-photo-item__thumb">
                              <img
                                src={photo.preview || photo.src}
                                alt={photo.title || `Photo ${index + 1}`}
                              />
                              {coverPhoto && (
                                <span className="gm-photo-item__cover-badge">Cover</span>
                              )}
                            </div>

                            {/* Title & Description inputs */}
                            <div className="gm-photo-item__body">
                              <input
                                type="text"
                                value={photo.title}
                                onChange={(e) =>
                                  handlePhotoChange(index, "title", e.target.value)
                                }
                                placeholder="Photo title"
                              />
                              <input
                                type="text"
                                value={photo.description}
                                onChange={(e) =>
                                  handlePhotoChange(index, "description", e.target.value)
                                }
                                placeholder="Description (optional)"
                              />
                            </div>

                            {/* Set Cover / Remove */}
                            <div className="gm-photo-item__actions">
                              <button
                                type="button"
                                className={`gm-photo-btn gm-photo-btn--cover${coverPhoto ? " is-cover" : ""}`}
                                onClick={() => handleSetCover(index)}
                                title={coverPhoto ? "This is the cover" : "Set as album cover"}
                              >
                                {coverPhoto ? "✓ Cover" : "Set Cover"}
                              </button>
                              <button
                                type="button"
                                className="gm-photo-btn gm-photo-btn--remove"
                                onClick={() => handleRemovePhoto(index)}
                                title="Remove photo"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </form>

              {/* ── Sticky Footer ─────────────────────────── */}
              <div className="gm-drawer__footer">
                <button
                  type="button"
                  className="gm-btn-cancel"
                  onClick={() => setShowDrawer(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="gm-album-form"
                  className="gm-btn-save"
                  disabled={saving}
                >
                  {saving && <span className="gm-btn-save__spinner" />}
                  {saving
                    ? "Saving…"
                    : editingItem
                    ? "Save Changes"
                    : "Create Album"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}