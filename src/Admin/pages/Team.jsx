import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import "./style/admin.css";

import {
  getTeamMembers,
  addTeamMember,
  updateTeamMember,
  deleteTeamMember,
} from "./services/teamService";

export default function Team() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    role: "",
    category: "Executive Board",
    linkedin: "",
    github: "",
    email: "",
    bio: "",
    order: 1,
    image: "",
  });

  const loadMembers = async () => {
    try {
      setLoading(true);
      const data = await getTeamMembers();
      setMembers(data);
    } catch (err) {
      console.error(err);
      alert("Failed to load team members.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      role: "",
      category: "Executive Board",
      linkedin: "",
      github: "",
      email: "",
      bio: "",
      order: members.length + 1,
      image: "",
    });
    setSelectedFile(null);
    setEditingMember(null);
  };

  const handleOpenDrawer = (member = null) => {
    if (member) {
      setEditingMember(member);
      setFormData({
        name: member.name || "",
        role: member.role || "",
        category: member.category || "Executive Board",
        linkedin: member.linkedin || "",
        github: member.github || "",
        email: member.email || "",
        bio: member.bio || "",
        order: member.order || 1,
        image: member.image || "",
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
    if (!formData.name.trim()) {
      alert("Member name is required.");
      return;
    }

    setSaving(true);
    try {
      if (editingMember) {
        await updateTeamMember(editingMember.id, formData, selectedFile);
        alert("Team Member updated successfully!");
      } else {
        await addTeamMember(formData, selectedFile);
        alert("Team Member added successfully!");
      }
      setShowDrawer(false);
      resetForm();
      await loadMembers();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to save team member.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (member) => {
    if (!window.confirm(`Delete team member "${member.name}"?`)) return;
    try {
      await deleteTeamMember(member.id);
      await loadMembers();
    } catch (err) {
      console.error(err);
      alert(err.message || "Delete failed.");
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Topbar />

        <div className="dashboard-content">
          {/* Header */}
          <div className="events-header">
            <div className="events-title">
              <h2>👥 Team Management</h2>
              <p>Manage club leads, executive board, and faculty coordinators.</p>
            </div>

            <button
              className="add-event-btn"
              onClick={() => handleOpenDrawer()}
            >
              + Add Member
            </button>
          </div>

          {/* List */}
          {loading ? (
            <div className="empty-card">
              <h3>Loading Team Members...</h3>
            </div>
          ) : members.length === 0 ? (
            <div className="empty-card">
              <div style={{ fontSize: "70px" }}>👥</div>
              <h3>No Team Members Found</h3>
              <p>Add your first club team member to display on the site.</p>
              <button
                className="add-event-btn"
                onClick={() => handleOpenDrawer()}
              >
                + Add Member
              </button>
            </div>
          ) : (
            <div className="events-grid">
              {members.map((member) => (
                <div className="event-card" key={member.id}>
                  {member.image ? (
                    <img
                      src={member.image}
                      alt={member.name}
                      className="event-image"
                      style={{ height: "200px", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        height: "200px",
                        background: "#1e293b",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "48px",
                        color: "#94a3b8",
                      }}
                    >
                      👤
                    </div>
                  )}

                  <div className="event-body">
                    <span
                      style={{
                        fontSize: "12px",
                        background: "rgba(234, 179, 8, 0.15)",
                        color: "#eab308",
                        padding: "3px 8px",
                        borderRadius: "12px",
                        fontWeight: "600",
                      }}
                    >
                      {member.category}
                    </span>

                    <h3 style={{ marginTop: "10px", marginBottom: "4px" }}>
                      {member.name}
                    </h3>
                    <p style={{ color: "#94a3b8", fontSize: "14px" }}>
                      {member.role}
                    </p>

                    {member.bio && (
                      <p style={{ fontSize: "13px", marginTop: "8px" }}>
                        {member.bio}
                      </p>
                    )}

                    <div style={{ marginTop: "15px", display: "flex", gap: "8px" }}>
                      <button
                        className="filter-btn"
                        style={{ background: "#3b82f6", color: "#fff" }}
                        onClick={() => handleOpenDrawer(member)}
                      >
                        Edit
                      </button>
                      <button
                        className="filter-btn"
                        onClick={() => handleDelete(member)}
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

        {/* Drawer Form */}
        {showDrawer && (
          <>
            <div
              className="drawer-overlay"
              onClick={() => setShowDrawer(false)}
            />

            <div className="event-drawer">
              <div className="drawer-header">
                <h2>{editingMember ? "Edit Member" : "Add Team Member"}</h2>
                <button
                  className="close-btn"
                  onClick={() => setShowDrawer(false)}
                >
                  ✕
                </button>
              </div>

              <form className="drawer-form" onSubmit={handleSubmit}>
                <label>Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Rahul Sharma"
                  required
                />

                <label>Role / Designation *</label>
                <input
                  type="text"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  placeholder="e.g. President / Tech Lead"
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
                  <option value="Faculty Co-ordinators">Faculty Co-ordinators</option>
                  <option value="Executive Board">Executive Board</option>
                  <option value="Core Team">Core Team</option>
                  <option value="Domain Leads">Domain Leads</option>
                </select>

                <label>Bio / Summary</label>
                <textarea
                  rows="3"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Short bio or description"
                />

                <label>Profile Image (File upload or URL)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                <input
                  type="url"
                  name="image"
                  value={formData.image}
                  onChange={handleChange}
                  placeholder="Or paste Image URL directly"
                  style={{ marginTop: "6px" }}
                />

                <label>LinkedIn Profile URL</label>
                <input
                  type="url"
                  name="linkedin"
                  value={formData.linkedin}
                  onChange={handleChange}
                  placeholder="https://linkedin.com/in/username"
                />

                <label>GitHub Profile URL</label>
                <input
                  type="url"
                  name="github"
                  value={formData.github}
                  onChange={handleChange}
                  placeholder="https://github.com/username"
                />

                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="email@example.com"
                />

                <label>Display Order Priority (Optional)</label>
                <input
                  type="number"
                  name="order"
                  value={formData.order}
                  onChange={handleChange}
                  placeholder="1, 2, 3..."
                />

                <button
                  className="add-event-btn"
                  type="submit"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingMember
                    ? "Update Member"
                    : "Save Member"}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
