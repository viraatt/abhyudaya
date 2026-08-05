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

export default function Gallery() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [activeCategory, setActiveCategory] = useState("All");

  const [formData, setFormData] = useState({
    title: "",
    category: "Events",
    imageUrl: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
  });

  const loadItems = async () => {
    try {
      setLoading(true);
      const data = await getGalleryItems();
      setItems(data);
    } catch (err) {
      console.error(err);
      alert("Failed to load gallery items.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const resetForm = () => {
    setFormData({
      title: "",
      category: "Events",
      imageUrl: "",
      date: new Date().toISOString().split("T")[0],
      description: "",
    });
    setSelectedFile(null);
    setEditingItem(null);
  };

  const handleOpenDrawer = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        title: item.title || "",
        category: item.category || "Events",
        imageUrl: item.imageUrl || "",
        date: item.date || new Date().toISOString().split("T")[0],
        description: item.description || "",
      });
    } else {
      resetForm();
    }
    setShowDrawer(true);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert("Title is required.");
      return;
    }

    if (!selectedFile && !formData.imageUrl) {
      alert("Please choose an image file or provide an image URL.");
      return;
    }

    setSaving(true);
    try {
      if (editingItem) {
        await updateGalleryItem(editingItem.id, formData, selectedFile);
        alert("Gallery photo updated!");
      } else {
        await addGalleryItem(formData, selectedFile);
        alert("Gallery photo added successfully!");
      }
      setShowDrawer(false);
      resetForm();
      await loadItems();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to save gallery photo.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete photo "${item.title}"?`)) return;
    try {
      await deleteGalleryItem(item.id);
      await loadItems();
    } catch (err) {
      console.error(err);
      alert(err.message || "Delete failed.");
    }
  };

  const categories = ["All", "TechBloom", "CommuniCraft", "Workshops", "Cultural", "Campus Life"];

  const filteredItems =
    activeCategory === "All"
      ? items
      : items.filter((item) => item.category === activeCategory);

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Topbar />

        <div className="dashboard-content">
          {/* Header */}
          <div className="events-header">
            <div className="events-title">
              <h2>🖼️ Gallery Management</h2>
              <p>Upload and organize event photos, fests, and club activities.</p>
            </div>

            <button className="add-event-btn" onClick={() => handleOpenDrawer()}>
              + Upload Photo
            </button>
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

          {/* Gallery Items Grid */}
          {loading ? (
            <div className="empty-card">
              <h3>Loading Gallery Photos...</h3>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="empty-card">
              <div style={{ fontSize: "70px" }}>🖼️</div>
              <h3>No Photos Found</h3>
              <p>Upload event photos to showcase in the public gallery.</p>
              <button className="add-event-btn" onClick={() => handleOpenDrawer()}>
                + Upload Photo
              </button>
            </div>
          ) : (
            <div className="events-grid">
              {filteredItems.map((item) => (
                <div className="event-card" key={item.id}>
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="event-image"
                    style={{ height: "220px", objectFit: "cover" }}
                  />

                  <div className="event-body">
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

                    <h3 style={{ marginTop: "10px", marginBottom: "4px" }}>
                      {item.title}
                    </h3>

                    {item.date && (
                      <small style={{ color: "#94a3b8" }}>{item.date}</small>
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

        {/* Upload Drawer */}
        {showDrawer && (
          <>
            <div
              className="drawer-overlay"
              onClick={() => setShowDrawer(false)}
            />

            <div className="event-drawer">
              <div className="drawer-header">
                <h2>{editingItem ? "Edit Photo" : "Upload Gallery Photo"}</h2>
                <button
                  className="close-btn"
                  onClick={() => setShowDrawer(false)}
                >
                  ✕
                </button>
              </div>

              <form className="drawer-form" onSubmit={handleSubmit}>
                <label>Photo Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g. Annual Hackathon 2026 Opening"
                  required
                />

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
                  <option value="TechBloom">TechBloom</option>
                  <option value="CommuniCraft">CommuniCraft</option>
                  <option value="Workshops">Workshops</option>
                  <option value="Cultural">Cultural</option>
                  <option value="Campus Life">Campus Life</option>
                </select>

                <label>Image File (Upload or URL)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                <input
                  type="url"
                  name="imageUrl"
                  value={formData.imageUrl}
                  onChange={handleChange}
                  placeholder="Or paste Direct Image URL"
                  style={{ marginTop: "6px" }}
                />

                <label>Event Date</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                />

                <label>Short Description (Optional)</label>
                <textarea
                  rows="3"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Details about this picture or event"
                />

                <button
                  className="add-event-btn"
                  type="submit"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingItem
                    ? "Update Photo"
                    : "Upload Photo"}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
