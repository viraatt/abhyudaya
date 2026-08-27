import { useEffect, useState, useMemo, useRef } from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import { useToast } from "../components/Toast";
import {
  LEVELS,
  LEVEL_LABELS,
  DEPARTMENT_OPTIONS,
  EXECUTIVE_DEPARTMENTS,
  ROLE_PRESETS,
  isValidUrl,
} from "../../components/team/teamUtils";
import {
  getTeamMembers,
  addTeamMember,
  updateTeamMember,
  deleteTeamMember,
  setTeamMemberActive,
} from "./services/teamService";
import {
  FaLinkedin,
  FaGithub,
  FaPlus,
  FaSearch,
  FaCheck,
  FaTimes,
  FaTrash,
  FaEdit,
  FaToggleOn,
  FaToggleOff,
  FaUserTie,
  FaUsers,
  FaUpload,
  FaImage,
} from "react-icons/fa";
import "./style/admin.css";

export default function Team() {
  const toast = useToast();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("ALL"); // ALL, LEADERSHIP, CORE, EXECUTIVE, FACULTY, ACTIVE, INACTIVE

  // Image Upload & Preview State
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const fileInputRef = useRef(null);

  // Form State
  const [selectedPreset, setSelectedPreset] = useState("President");
  const [formData, setFormData] = useState({
    name: "",
    role: "President",
    level: LEVELS.LEADERSHIP,
    department: "Leadership",
    category: "Executive Board",
    linkedin: "",
    github: "",
    email: "",
    bio: "",
    order: 1,
    image: "",
    active: true,
  });

  const loadMembers = async () => {
    try {
      setLoading(true);
      const data = await getTeamMembers();
      setMembers(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load team members.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const resetForm = () => {
    const nextOrder = members.length > 0 ? Math.max(...members.map((m) => Number(m.order) || 0)) + 1 : 1;
    setSelectedPreset("President");
    setFormData({
      name: "",
      role: "President",
      level: LEVELS.LEADERSHIP,
      department: "Leadership",
      category: "Executive Board",
      linkedin: "",
      github: "",
      email: "",
      bio: "",
      order: nextOrder,
      image: "",
      active: true,
    });
    setSelectedFile(null);
    setImagePreview("");
    setEditingMember(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenDrawer = (member = null) => {
    if (member) {
      setEditingMember(member);
      // Check if role matches one of the presets
      const matchingPreset = ROLE_PRESETS.find((p) => p.value === member.role);
      setSelectedPreset(matchingPreset ? matchingPreset.value : "custom");

      setFormData({
        name: member.name || "",
        role: member.role || "",
        level: member.level || LEVELS.EXECUTIVE,
        department: member.department || "Operations",
        category: member.category || "Domain Leads",
        linkedin: member.linkedin || "",
        github: member.github || "",
        email: member.email || "",
        bio: member.bio || "",
        order: member.order !== undefined && member.order !== null ? Number(member.order) : 1,
        image: member.image || "",
        active: member.active === false ? false : true,
      });
      setImagePreview(member.image || "");
      setSelectedFile(null);
    } else {
      resetForm();
    }
    setShowDrawer(true);
  };

  // Handle Preset Role Selection
  const handlePresetChange = (presetValue) => {
    setSelectedPreset(presetValue);

    if (presetValue === "custom") {
      setFormData((prev) => ({
        ...prev,
        level: LEVELS.EXECUTIVE,
        department: prev.department && EXECUTIVE_DEPARTMENTS.includes(prev.department) ? prev.department : "Operations",
      }));
      return;
    }

    const preset = ROLE_PRESETS.find((p) => p.value === presetValue);
    if (preset) {
      setFormData((prev) => ({
        ...prev,
        role: preset.value,
        level: preset.level,
        department: preset.department,
        category: preset.category,
        // Clear GitHub if switching to Faculty Advisor
        github: preset.level === LEVELS.FACULTY_ADVISOR ? "" : prev.github,
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (name === "image") {
      setImagePreview(value);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);
    }
  };

  const handleClearImage = () => {
    setSelectedFile(null);
    setImagePreview("");
    setFormData((prev) => ({ ...prev, image: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Member full name is required.");
      return;
    }
    if (!formData.role.trim()) {
      toast.error("Member role/designation is required.");
      return;
    }
    if (!formData.image && !selectedFile) {
      toast.error("Please upload a profile photo or provide an Image URL.");
      return;
    }
    if (formData.linkedin && !isValidUrl(formData.linkedin)) {
      toast.error("Please enter a valid LinkedIn URL (e.g. https://linkedin.com/in/username).");
      return;
    }
    if (formData.github && !isValidUrl(formData.github)) {
      toast.error("Please enter a valid GitHub URL (e.g. https://github.com/username).");
      return;
    }

    setSaving(true);
    try {
      if (editingMember) {
        await updateTeamMember(editingMember.id, formData, selectedFile);
        toast.success(`Updated "${formData.name}" successfully!`);
      } else {
        await addTeamMember(formData, selectedFile);
        toast.success(`Added "${formData.name}" to team successfully!`);
      }
      setShowDrawer(false);
      resetForm();
      await loadMembers();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to save team member.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (member, e) => {
    e.stopPropagation();
    const newStatus = member.active === false ? true : false;
    try {
      setStatusUpdatingId(member.id);
      await setTeamMemberActive(member.id, newStatus);
      toast.success(
        newStatus
          ? `Activated "${member.name}" — visible on public site.`
          : `Deactivated "${member.name}" — hidden from public site.`
      );
      await loadMembers();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to update member status.");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleDelete = async (member, e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${member.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      setDeletingId(member.id);
      await deleteTeamMember(member.id);
      toast.success(`Deleted "${member.name}".`);
      await loadMembers();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to delete team member.");
    } finally {
      setDeletingId(null);
    }
  };

  // Filter & Search Logic
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      // Search matching
      const matchesSearch =
        !searchTerm.trim() ||
        (m.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.role || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.department || "").toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Tab filtering
      if (activeTab === "ALL") return true;
      if (activeTab === "ACTIVE") return m.active !== false;
      if (activeTab === "INACTIVE") return m.active === false;
      if (activeTab === "LEADERSHIP") return m.level === LEVELS.LEADERSHIP;
      if (activeTab === "CORE") return m.level === LEVELS.CORE;
      if (activeTab === "EXECUTIVE") return m.level === LEVELS.EXECUTIVE;
      if (activeTab === "FACULTY") return m.level === LEVELS.FACULTY_ADVISOR;

      return true;
    });
  }, [members, searchTerm, activeTab]);

  // Statistics
  const stats = useMemo(() => {
    const total = members.length;
    const activeCount = members.filter((m) => m.active !== false).length;
    const leadershipCount = members.filter((m) => m.level === LEVELS.LEADERSHIP).length;
    const coreCount = members.filter((m) => m.level === LEVELS.CORE).length;
    const execCount = members.filter((m) => m.level === LEVELS.EXECUTIVE).length;
    const facultyCount = members.filter((m) => m.level === LEVELS.FACULTY_ADVISOR).length;
    return { total, activeCount, leadershipCount, coreCount, execCount, facultyCount };
  }, [members]);

  const isFacultyRole = formData.level === LEVELS.FACULTY_ADVISOR;

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Topbar />

        <div className="dashboard-content">
          {/* Header */}
          <div className="events-header">
            <div className="events-title">
              <h2>👥 Abhyudaya Team Management</h2>
              <p>Manage Faculty Advisor, The Leadership, Core Team, and Department Executives.</p>
            </div>

            <button className="add-event-btn" onClick={() => handleOpenDrawer()}>
              <FaPlus style={{ marginRight: "6px" }} /> Add Member
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "14px",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                background: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: "12px",
                padding: "14px 16px",
              }}
            >
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>Total Members</span>
              <div style={{ fontSize: "24px", fontWeight: "700", color: "#f8fafc", marginTop: "4px" }}>
                {stats.total}
              </div>
            </div>

            <div
              style={{
                background: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: "12px",
                padding: "14px 16px",
              }}
            >
              <span style={{ fontSize: "12px", color: "#22c55e" }}>Active Public</span>
              <div style={{ fontSize: "24px", fontWeight: "700", color: "#22c55e", marginTop: "4px" }}>
                {stats.activeCount}
              </div>
            </div>

            <div
              style={{
                background: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: "12px",
                padding: "14px 16px",
              }}
            >
              <span style={{ fontSize: "12px", color: "#eab308" }}>Leadership</span>
              <div style={{ fontSize: "24px", fontWeight: "700", color: "#eab308", marginTop: "4px" }}>
                {stats.leadershipCount}
              </div>
            </div>

            <div
              style={{
                background: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: "12px",
                padding: "14px 16px",
              }}
            >
              <span style={{ fontSize: "12px", color: "#38bdf8" }}>Core Leads</span>
              <div style={{ fontSize: "24px", fontWeight: "700", color: "#38bdf8", marginTop: "4px" }}>
                {stats.coreCount}
              </div>
            </div>

            <div
              style={{
                background: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: "12px",
                padding: "14px 16px",
              }}
            >
              <span style={{ fontSize: "12px", color: "#a855f7" }}>Executives</span>
              <div style={{ fontSize: "24px", fontWeight: "700", color: "#a855f7", marginTop: "4px" }}>
                {stats.execCount}
              </div>
            </div>

            <div
              style={{
                background: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: "12px",
                padding: "14px 16px",
              }}
            >
              <span style={{ fontSize: "12px", color: "#ec4899" }}>Faculty Advisor</span>
              <div style={{ fontSize: "24px", fontWeight: "700", color: "#ec4899", marginTop: "4px" }}>
                {stats.facultyCount}
              </div>
            </div>
          </div>

          {/* Controls Bar: Search & Filter Tabs */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              marginBottom: "20px",
              background: "#0f172a",
              padding: "12px 16px",
              borderRadius: "14px",
              border: "1px solid #1e293b",
            }}
          >
            {/* Filter Tabs */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {[
                { id: "ALL", label: "All" },
                { id: "LEADERSHIP", label: "Leadership" },
                { id: "CORE", label: "Core" },
                { id: "EXECUTIVE", label: "Executives" },
                { id: "FACULTY", label: "Faculty" },
                { id: "ACTIVE", label: "Active" },
                { id: "INACTIVE", label: "Inactive" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: "600",
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    background: activeTab === tab.id ? "#2563eb" : "#1e293b",
                    color: activeTab === tab.id ? "#ffffff" : "#94a3b8",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div style={{ position: "relative", minWidth: "220px" }}>
              <FaSearch
                style={{
                  position: "absolute",
                  left: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#64748b",
                  fontSize: "13px",
                }}
              />
              <input
                type="text"
                placeholder="Search member, role, vertical..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px 8px 32px",
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  color: "#ffffff",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Members List */}
          {loading ? (
            <div className="empty-card">
              <h3>Loading Team Members...</h3>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="empty-card">
              <div style={{ fontSize: "64px", marginBottom: "12px" }}>👥</div>
              <h3>No team members found</h3>
              <p style={{ color: "#94a3b8" }}>
                {searchTerm || activeTab !== "ALL"
                  ? "Try changing your search or filter options."
                  : "Add your first club leader or executive to display on the site."}
              </p>
              <button
                className="add-event-btn"
                style={{ marginTop: "12px" }}
                onClick={() => handleOpenDrawer()}
              >
                + Add Member
              </button>
            </div>
          ) : (
            <div className="events-grid">
              {filteredMembers.map((member) => {
                const isActive = member.active !== false;

                return (
                  <div
                    className="event-card"
                    key={member.id}
                    style={{
                      opacity: isActive ? 1 : 0.65,
                      border: isActive ? "1px solid #1e293b" : "1px dashed #ef4444",
                    }}
                  >
                    <div style={{ position: "relative", height: "220px", background: "#0f172a", overflow: "hidden" }}>
                      {member.image ? (
                        <img
                          src={member.image}
                          alt={member.name}
                          className="event-image"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <div
                          style={{
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "56px",
                            color: "#475569",
                          }}
                        >
                          👤
                        </div>
                      )}

                      {/* Status Badge */}
                      <span
                        style={{
                          position: "absolute",
                          top: "10px",
                          right: "10px",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: "700",
                          background: isActive ? "rgba(34, 197, 94, 0.9)" : "rgba(239, 68, 68, 0.9)",
                          color: "#ffffff",
                          backdropFilter: "blur(4px)",
                        }}
                      >
                        {isActive ? "ACTIVE" : "INACTIVE"}
                      </span>

                      {/* Level Badge */}
                      <span
                        style={{
                          position: "absolute",
                          top: "10px",
                          left: "10px",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: "700",
                          background: "rgba(15, 23, 42, 0.85)",
                          color:
                            member.level === LEVELS.FACULTY_ADVISOR
                              ? "#ec4899"
                              : member.level === LEVELS.LEADERSHIP
                              ? "#eab308"
                              : member.level === LEVELS.CORE
                              ? "#38bdf8"
                              : "#a855f7",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                        }}
                      >
                        {LEVEL_LABELS[member.level] || member.level}
                      </span>
                    </div>

                    <div className="event-body">
                      {/* Department & Order Bar */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "8px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "12px",
                            background: "rgba(59, 130, 246, 0.15)",
                            color: "#60a5fa",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            fontWeight: "600",
                          }}
                        >
                          {member.department || "No Vertical"}
                        </span>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>
                          Order: #{member.order ?? 99}
                        </span>
                      </div>

                      <h3 style={{ marginTop: "4px", marginBottom: "2px", color: "#ffffff" }}>
                        {member.name}
                      </h3>
                      <p style={{ color: "#94a3b8", fontSize: "14px", fontWeight: "500" }}>
                        {member.role}
                      </p>

                      {member.bio && (
                        <p
                          style={{
                            fontSize: "12px",
                            color: "#64748b",
                            marginTop: "8px",
                            lineHeight: "1.4",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {member.bio}
                        </p>
                      )}

                      {/* Social icons presence */}
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          marginTop: "12px",
                          alignItems: "center",
                        }}
                      >
                        {member.linkedin ? (
                          <span
                            title={`LinkedIn: ${member.linkedin}`}
                            style={{
                              color: "#0077b5",
                              fontSize: "14px",
                              display: "inline-flex",
                            }}
                          >
                            <FaLinkedin />
                          </span>
                        ) : null}
                        {member.github ? (
                          <span
                            title={`GitHub: ${member.github}`}
                            style={{
                              color: "#e2e8f0",
                              fontSize: "14px",
                              display: "inline-flex",
                            }}
                          >
                            <FaGithub />
                          </span>
                        ) : null}
                      </div>

                      {/* Action Buttons */}
                      <div
                        style={{
                          marginTop: "16px",
                          paddingTop: "12px",
                          borderTop: "1px solid #1e293b",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "8px",
                        }}
                      >
                        <button
                          type="button"
                          onClick={(e) => handleToggleActive(member, e)}
                          disabled={statusUpdatingId === member.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "6px 10px",
                            fontSize: "12px",
                            fontWeight: "600",
                            borderRadius: "6px",
                            border: "none",
                            cursor: "pointer",
                            background: isActive ? "rgba(239, 68, 68, 0.15)" : "rgba(34, 197, 94, 0.15)",
                            color: isActive ? "#ef4444" : "#22c55e",
                          }}
                          title={isActive ? "Deactivate member" : "Activate member"}
                        >
                          {isActive ? <FaToggleOff /> : <FaToggleOn />}
                          <span>{isActive ? "Deactivate" : "Activate"}</span>
                        </button>

                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            className="filter-btn"
                            style={{
                              background: "#2563eb",
                              color: "#fff",
                              padding: "6px 12px",
                              fontSize: "12px",
                            }}
                            onClick={() => handleOpenDrawer(member)}
                          >
                            <FaEdit style={{ marginRight: "4px" }} /> Edit
                          </button>
                          <button
                            className="filter-btn"
                            style={{
                              background: "#dc2626",
                              color: "#fff",
                              padding: "6px 10px",
                              fontSize: "12px",
                            }}
                            disabled={deletingId === member.id}
                            onClick={(e) => handleDelete(member, e)}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Drawer Form Modal */}
        {showDrawer && (
          <>
            <div className="drawer-overlay" onClick={() => setShowDrawer(false)} />

            <div className="event-drawer" style={{ maxWidth: "560px", width: "100%" }}>
              <div className="drawer-header">
                <h2>{editingMember ? "Edit Team Member" : "Add Team Member"}</h2>
                <button
                  type="button"
                  className="close-btn"
                  onClick={() => setShowDrawer(false)}
                >
                  ✕
                </button>
              </div>

              <form className="drawer-form" onSubmit={handleSubmit}>
                {/* 1. Quick Role Preset Selector */}
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: "600" }}>
                    Select Role Preset / Tier *
                  </label>
                  <select
                    value={selectedPreset}
                    onChange={(e) => handlePresetChange(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      background: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "14px",
                    }}
                  >
                    <optgroup label="Faculty Advisory">
                      <option value="Faculty Advisor">Faculty Advisor</option>
                    </optgroup>
                    <optgroup label="The Leadership">
                      <option value="President">President</option>
                      <option value="Vice President">Vice President</option>
                      <option value="General Secretary">General Secretary</option>
                    </optgroup>
                    <optgroup label="The Core Team (Domain Leads)">
                      <option value="Operations Lead">Operations Lead</option>
                      <option value="Technical Lead">Technical Lead</option>
                      <option value="PR Lead">PR Lead</option>
                    </optgroup>
                    <optgroup label="Department Executives">
                      <option value="Operations Executive">Operations Executive</option>
                      <option value="Technical Executive">Technical Executive</option>
                      <option value="PR Executive">PR Executive</option>
                      <option value="custom">Custom Executive / Custom Role</option>
                    </optgroup>
                  </select>
                </div>

                {/* 2. Full Name */}
                <label>Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Virat Mishra"
                  required
                />

                {/* 3. Role / Designation */}
                <label>Role / Title *</label>
                <input
                  type="text"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  placeholder="e.g. Technical Lead"
                  required
                />

                {/* 4. Level & Department Locked or Configurable */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                    marginTop: "6px",
                    marginBottom: "12px",
                  }}
                >
                  <div>
                    <label>Tier Level *</label>
                    <select
                      name="level"
                      value={formData.level}
                      onChange={handleChange}
                      style={{
                        width: "100%",
                        padding: "10px",
                        background: "#0f172a",
                        border: "1px solid #334155",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                    >
                      <option value={LEVELS.FACULTY_ADVISOR}>Faculty Advisor</option>
                      <option value={LEVELS.LEADERSHIP}>Leadership</option>
                      <option value={LEVELS.CORE}>Core Team</option>
                      <option value={LEVELS.EXECUTIVE}>Executive</option>
                    </select>
                  </div>

                  <div>
                    <label>Department / Vertical *</label>
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      style={{
                        width: "100%",
                        padding: "10px",
                        background: "#0f172a",
                        border: "1px solid #334155",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                    >
                      {DEPARTMENT_OPTIONS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 5. Profile Image (Upload with live preview + URL option) */}
                <label>Profile Image *</label>
                <div
                  style={{
                    display: "flex",
                    gap: "14px",
                    alignItems: "center",
                    background: "#0f172a",
                    border: "1px dashed #334155",
                    borderRadius: "10px",
                    padding: "12px",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      width: "72px",
                      height: "72px",
                      borderRadius: "10px",
                      background: "#1e293b",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      border: "1px solid #334155",
                    }}
                  >
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Preview"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <FaImage style={{ fontSize: "28px", color: "#64748b" }} />
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
                      <label
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          background: "#2563eb",
                          color: "#fff",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          cursor: "pointer",
                          fontWeight: "600",
                        }}
                      >
                        <FaUpload /> Upload Photo
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          style={{ display: "none" }}
                        />
                      </label>

                      {imagePreview && (
                        <button
                          type="button"
                          onClick={handleClearImage}
                          style={{
                            background: "transparent",
                            border: "1px solid #ef4444",
                            color: "#ef4444",
                            padding: "6px 10px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            cursor: "pointer",
                          }}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <span style={{ fontSize: "11px", color: "#64748b" }}>
                      {selectedFile ? `Selected: ${selectedFile.name}` : "Or enter direct image URL below:"}
                    </span>
                  </div>
                </div>

                <input
                  type="url"
                  name="image"
                  value={formData.image}
                  onChange={handleChange}
                  placeholder="https://example.com/photo.jpg"
                  style={{ marginBottom: "12px" }}
                />

                {/* 6. Bio / Description */}
                <label>Bio / Description (Optional)</label>
                <textarea
                  rows="3"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Short bio or description of role & responsibilities..."
                />

                {/* 7. Social Links */}
                <div style={{ marginTop: "8px" }}>
                  <label>LinkedIn Profile URL (Optional)</label>
                  <input
                    type="url"
                    name="linkedin"
                    value={formData.linkedin}
                    onChange={handleChange}
                    placeholder="https://www.linkedin.com/in/username"
                  />
                </div>

                {!isFacultyRole && (
                  <div style={{ marginTop: "8px" }}>
                    <label>GitHub Profile URL (Optional)</label>
                    <input
                      type="url"
                      name="github"
                      value={formData.github}
                      onChange={handleChange}
                      placeholder="https://github.com/username"
                    />
                  </div>
                )}

                {/* 8. Display Order & Active Status */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                    marginTop: "12px",
                  }}
                >
                  <div>
                    <label>Display Order Priority</label>
                    <input
                      type="number"
                      name="order"
                      value={formData.order}
                      onChange={handleChange}
                      placeholder="1, 2, 3..."
                      min="1"
                    />
                  </div>

                  <div>
                    <label>Public Status</label>
                    <select
                      name="active"
                      value={formData.active ? "true" : "false"}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          active: e.target.value === "true",
                        }))
                      }
                      style={{
                        width: "100%",
                        padding: "10px",
                        background: "#0f172a",
                        border: "1px solid #334155",
                        borderRadius: "8px",
                        color: formData.active ? "#22c55e" : "#ef4444",
                        fontWeight: "600",
                      }}
                    >
                      <option value="true">Active (Visible)</option>
                      <option value="false">Inactive (Hidden)</option>
                    </select>
                  </div>
                </div>

                {/* Save button */}
                <button
                  className="add-event-btn"
                  type="submit"
                  disabled={saving}
                  style={{ marginTop: "20px", width: "100%" }}
                >
                  {saving
                    ? "Saving Member to Firebase..."
                    : editingMember
                    ? "Update Team Member"
                    : "Save Team Member"}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
