import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import "./style/admin.css";
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

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setPhotos([]);
    setEditingItem(null);
    setSlugTouched(false);
  };

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

  const categories = ["All", ...GALLERY_CATEGORIES];
  const statuses = ["All", "Published", "Draft"];

  const filteredItems = items.filter((item) => {
    const catMatch = activeCategory === "All" || item.category === activeCategory;
    const statusMatch = activeStatus === "All" || item.status === activeStatus;
    return catMatch && statusMatch;
  });

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Topbar />

        <div className="dashboard-content">
          {/* Header */}
          <div className="events-header">
            <div className="events-title">
              <h2>🖼️ Gallery Album Management</h2>
              <p>Create and manage photo albums for the public gallery.</p>
            </div>

            <button className="add-event-btn" onClick={() => handleOpenDrawer()}>
              + Create Album
            </button>
          </div>

          {/* Cloudinary Free Plan Tip Banner */}
          <div
            style={{
              background: "rgba(59, 130, 246, 0.1)",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              borderRadius: "12px",
              padding: "12px 16px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              color: "#93c5fd",
              fontSize: "13px",
              lineHeight: "1.5",
            }}
          >
            <span style={{ fontSize: "20px" }}>💡</span>
            <div>
              <strong>Cloudinary Free Plan Optimization:</strong> Recommended photo dimensions are <strong>1600px–2400px</strong> (JPEG/WebP under 2 MB). This conserves your monthly 25 credits while ensuring sharp display on mobile & desktop displays.
            </div>
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px" }}>
            {categories.map((cat) => (
              <button
                key={cat}
                className="filter-btn"
                style={{
                  background: activeCategory === cat ? "#3b82f6" : "#1e293b",
                  color: "#fff",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "20px",
                  cursor: "pointer",
                }}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Status Filter Pills */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px" }}>
            {statuses.map((st) => (
              <button
                key={st}
                className="filter-btn"
                style={{
                  background: activeStatus === st ? "#10b981" : "#1e293b",
                  color: "#fff",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "20px",
                  cursor: "pointer",
                }}
                onClick={() => setActiveStatus(st)}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Gallery Items Grid */}
          {loading ? (
            <div className="empty-card">
              <h3>Loading Gallery Albums...</h3>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="empty-card">
              <div style={{ fontSize: "70px" }}>🖼️</div>
              <h3>No Albums Found</h3>
              <p>Create photo albums to showcase in the public gallery.</p>
              <button className="add-event-btn" onClick={() => handleOpenDrawer()}>
                + Create Album
              </button>
            </div>
          ) : (
            <div className="events-grid">
              {filteredItems.map((item) => (
                <div className="event-card" key={item.id}>
                  <img
                    src={item.coverImage || (item.photos?.[0]?.src) || ""}
                    alt={item.title}
                    className="event-image"
                    style={{ height: "220px", objectFit: "cover" }}
                  />

                  <div className="event-body">
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: "12px",
                          background: "rgba(59, 130, 246, 0.15)",
                          color: "#60a5fa",
                          padding: "3px 8px",
                          borderRadius: "12px",
                          fontWeight: "600",
                        }}
                      >
                        {item.category}
                      </span>
                      <span
                        style={{
                          fontSize: "12px",
                          background: item.status === "Published" ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                          color: item.status === "Published" ? "#34d399" : "#fbbf24",
                          padding: "3px 8px",
                          borderRadius: "12px",
                          fontWeight: "600",
                        }}
                      >
                        {item.status}
                      </span>
                      {item.featured && (
                        <span
                          style={{
                            fontSize: "12px",
                            background: "rgba(245, 158, 11, 0.15)",
                            color: "#fbbf24",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontWeight: "600",
                          }}
                        >
                          ⭐ Featured
                        </span>
                      )}
                    </div>

                    <h3 style={{ marginTop: "10px", marginBottom: "4px" }}>
                      {item.title}
                    </h3>

                    {item.date && (
                      <small style={{ color: "#94a3b8" }}>
                        {item.date} • {item.photos?.length || 0} photos
                      </small>
                    )}

                    {item.description && (
                      <p style={{ fontSize: "13px", marginTop: "6px" }}>
                        {item.description}
                      </p>
                    )}

                    <div style={{ marginTop: "15px", display: "flex", gap: "8px" }}>
                      <button
                        className="filter-btn"
                        style={{ background: "#3b82f6", color: "#fff" }}
                        onClick={() => handleOpenDrawer(item)}
                      >
                        Edit
                      </button>
                      <button
                        className="filter-btn"
                        onClick={() => handleDelete(item)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Album Drawer */}
        {showDrawer && (
          <>
            <div
              className="drawer-overlay"
              onClick={() => setShowDrawer(false)}
            />

            <div className="event-drawer" style={{ width: "min(720px, 100%)" }}>
              <div className="drawer-header">
                <h2>{editingItem ? "Edit Album" : "Create Album"}</h2>
                <button
                  className="close-btn"
                  onClick={() => setShowDrawer(false)}
                >
                  ✕
                </button>
              </div>

              <form className="drawer-form" onSubmit={handleSubmit}>
                {/* Album Information */}
                <label>Album Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g. TechBloom 2.0"
                  required
                />

                <label>Subtitle</label>
                <input
                  type="text"
                  name="subtitle"
                  value={formData.subtitle}
                  onChange={handleChange}
                  placeholder="e.g. Flagship Technical Festival"
                />

                <label>Slug</label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleSlugChange}
                  placeholder="auto-generated from title"
                />
                <small style={{ color: "#64748b", marginTop: "-8px", display: "block" }}>
                  URL: /gallery/{formData.slug || "..."}
                </small>

                <label>Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  style={{
                    padding: "10px",
                    background: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                >
                  {GALLERY_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label>Date</label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
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

                <label>Description</label>
                <textarea
                  rows="3"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Details about this event album"
                />

                <div style={{ display: "flex", gap: "20px", marginTop: "10px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      name="featured"
                      checked={formData.featured}
                      onChange={handleChange}
                    />
                    ⭐ Featured Album
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
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
                    Published
                  </label>
                </div>

                {/* Photos */}
                <label style={{ marginTop: "20px" }}>Photos *</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoFiles}
                />
                <small style={{ color: "#64748b", marginTop: "-8px", display: "block" }}>
                  You can select multiple images at once. Images only.
                </small>

                {photos.length > 0 && (
                  <div style={{ marginTop: "15px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    {photos.map((photo, index) => (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          gap: "12px",
                          background: "#0f172a",
                          border: "1px solid #334155",
                          borderRadius: "8px",
                          padding: "10px",
                          alignItems: "center",
                        }}
                      >
                        <img
                          src={photo.preview || photo.src}
                          alt={photo.title || `Photo ${index + 1}`}
                          style={{ width: "80px", height: "60px", objectFit: "cover", borderRadius: "6px" }}
                        />
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                          <input
                            type="text"
                            value={photo.title}
                            onChange={(e) => handlePhotoChange(index, "title", e.target.value)}
                            placeholder="Photo title"
                            style={{ padding: "6px", background: "#1e293b", border: "1px solid #334155", borderRadius: "6px", color: "#fff" }}
                          />
                          <input
                            type="text"
                            value={photo.description}
                            onChange={(e) => handlePhotoChange(index, "description", e.target.value)}
                            placeholder="Photo description (optional)"
                            style={{ padding: "6px", background: "#1e293b", border: "1px solid #334155", borderRadius: "6px", color: "#fff" }}
                          />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <button
                            type="button"
                            className="filter-btn"
                            style={{
                              background: formData.coverImage === (photo.src || photo.preview) ? "#10b981" : "#1e293b",
                              color: "#fff",
                              fontSize: "11px",
                              padding: "4px 8px",
                            }}
                            onClick={() => handleSetCover(index)}
                          >
                            {formData.coverImage === (photo.src || photo.preview) ? "✓ Cover" : "Set Cover"}
                          </button>
                          <button
                            type="button"
                            className="filter-btn"
                            style={{ background: "#ef4444", color: "#fff", fontSize: "11px", padding: "4px 8px" }}
                            onClick={() => handleRemovePhoto(index)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  className="add-event-btn"
                  type="submit"
                  disabled={saving}
                  style={{ marginTop: "20px" }}
                >
                  {saving
                    ? "Saving..."
                    : editingItem
                    ? "Update Album"
                    : "Create Album"}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}