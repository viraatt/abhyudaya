import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
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
  FaTimes,
  FaTrash,
  FaEdit,
  FaToggleOn,
  FaToggleOff,
  FaUserTie,
  FaUsers,
  FaUpload,
  FaImage,
  FaCrown,
  FaUserCheck,
  FaChalkboardTeacher,
  FaAward,
  FaThLarge,
  FaList,
  FaExternalLinkAlt,
  FaExclamationTriangle,
  FaEnvelope,
  FaFilter,
  FaRedo,
  FaLaptopCode,
} from "react-icons/fa";
import "./style/admin.css";
import "./Team.css";

const INITIAL_FORM_STATE = {
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
};

export default function Team() {
  const toast = useToast();

  // Data State
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  // Search, Filter & View Mode
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("ALL"); // ALL, LEADERSHIP, CORE, EXECUTIVE, FACULTY, ACTIVE, INACTIVE
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [viewMode, setViewMode] = useState("grid"); // grid | table

  // Drawer / Form State
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState("President");
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [isFormDirty, setIsFormDirty] = useState(false);

  // Image Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Confirmation Modals State
  const [deleteModalMember, setDeleteModalMember] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  // Load team data from Firestore
  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getTeamMembers();
      setMembers(data || []);
    } catch (err) {
      console.error("Failed to load team members:", err);
      toast.error("Failed to load team members from database.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Dynamic Statistics
  const stats = useMemo(() => {
    const total = members.length;
    const activeCount = members.filter((m) => m.active !== false).length;
    const leadershipCount = members.filter((m) => m.level === LEVELS.LEADERSHIP).length;
    const coreCount = members.filter((m) => m.level === LEVELS.CORE).length;
    const execCount = members.filter((m) => m.level === LEVELS.EXECUTIVE).length;
    const webDevCount = members.filter(
      (m) => m.level === LEVELS.WEB_DEV || m.department === "Web Development"
    ).length;
    const facultyCount = members.filter((m) => m.level === LEVELS.FACULTY_ADVISOR).length;
    return { total, activeCount, leadershipCount, coreCount, execCount, webDevCount, facultyCount };
  }, [members]);

  // Tab count helper
  const getTabCount = useCallback(
    (tabId) => {
      switch (tabId) {
        case "ALL":
          return members.length;
        case "ACTIVE":
          return stats.activeCount;
        case "INACTIVE":
          return members.length - stats.activeCount;
        case "LEADERSHIP":
          return stats.leadershipCount;
        case "CORE":
          return stats.coreCount;
        case "EXECUTIVE":
          return stats.execCount;
        case "WEB_DEV":
          return stats.webDevCount;
        case "FACULTY":
          return stats.facultyCount;
        default:
          return 0;
      }
    },
    [members.length, stats]
  );

  // Filter & Search Logic
  const filteredMembers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return members.filter((m) => {
      // Search matching (name, role, department, email, bio)
      if (query) {
        const nameMatch = (m.name || "").toLowerCase().includes(query);
        const roleMatch = (m.role || "").toLowerCase().includes(query);
        const deptMatch = (m.department || "").toLowerCase().includes(query);
        const emailMatch = (m.email || "").toLowerCase().includes(query);
        const bioMatch = (m.bio || "").toLowerCase().includes(query);
        if (!nameMatch && !roleMatch && !deptMatch && !emailMatch && !bioMatch) {
          return false;
        }
      }

      // Department filter
      if (selectedDept !== "ALL" && m.department !== selectedDept) {
        return false;
      }

      // Tab filter
      if (activeTab === "ALL") return true;
      if (activeTab === "ACTIVE") return m.active !== false;
      if (activeTab === "INACTIVE") return m.active === false;
      if (activeTab === "LEADERSHIP") return m.level === LEVELS.LEADERSHIP;
      if (activeTab === "CORE") return m.level === LEVELS.CORE;
      if (activeTab === "EXECUTIVE") return m.level === LEVELS.EXECUTIVE;
      if (activeTab === "WEB_DEV") {
        return m.level === LEVELS.WEB_DEV || m.department === "Web Development";
      }
      if (activeTab === "FACULTY") return m.level === LEVELS.FACULTY_ADVISOR;

      return true;
    });
  }, [members, searchTerm, selectedDept, activeTab]);

  const hasActiveFilters = searchTerm !== "" || activeTab !== "ALL" || selectedDept !== "ALL";

  const handleResetFilters = () => {
    setSearchTerm("");
    setActiveTab("ALL");
    setSelectedDept("ALL");
  };

  // Form Management
  const resetForm = () => {
    const nextOrder =
      members.length > 0
        ? Math.max(...members.map((m) => Number(m.order) || 0)) + 1
        : 1;

    setSelectedPreset("President");
    setFormData({
      ...INITIAL_FORM_STATE,
      order: nextOrder,
    });
    setSelectedFile(null);
    setImagePreview("");
    setEditingMember(null);
    setIsFormDirty(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenDrawer = (member = null) => {
    if (member) {
      setEditingMember(member);
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
    setIsFormDirty(false);
    setShowDrawer(true);
  };

  const handleCloseDrawer = () => {
    if (isFormDirty) {
      setShowUnsavedModal(true);
    } else {
      setShowDrawer(false);
      resetForm();
    }
  };

  const confirmDiscardChanges = () => {
    setShowUnsavedModal(false);
    setShowDrawer(false);
    resetForm();
  };

  // Preset Role Change
  const handlePresetChange = (presetValue) => {
    setSelectedPreset(presetValue);
    setIsFormDirty(true);

    if (presetValue === "custom") {
      setFormData((prev) => ({
        ...prev,
        level: LEVELS.EXECUTIVE,
        department:
          prev.department && EXECUTIVE_DEPARTMENTS.includes(prev.department)
            ? prev.department
            : "Operations",
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
        github: preset.level === LEVELS.FACULTY_ADVISOR ? "" : prev.github,
      }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setIsFormDirty(true);

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

  const handleFileSelect = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, WEBP, etc.).");
      return;
    }
    setSelectedFile(file);
    setIsFormDirty(true);
    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleClearImage = () => {
    setSelectedFile(null);
    setImagePreview("");
    setFormData((prev) => ({ ...prev, image: "" }));
    setIsFormDirty(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Submit Form
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Member full name is required.");
      return;
    }
    if (!formData.role.trim()) {
      toast.error("Member designation / role is required.");
      return;
    }
    if (!formData.image && !selectedFile) {
      toast.error("Please upload a profile photo or enter an image URL.");
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

  // Toggle Active / Inactive
  const handleToggleActive = async (member, e) => {
    if (e) e.stopPropagation();
    const newStatus = member.active === false ? true : false;
    try {
      setStatusUpdatingId(member.id);
      await setTeamMemberActive(member.id, newStatus);
      toast.success(
        newStatus
          ? `Activated "${member.name}" — now visible on public site.`
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

  // Delete Action via Modal
  const openDeleteModal = (member, e) => {
    if (e) e.stopPropagation();
    setDeleteModalMember(member);
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalMember) return;
    setIsDeleting(true);
    try {
      await deleteTeamMember(deleteModalMember.id);
      toast.success(`Permanently deleted "${deleteModalMember.name}".`);
      setDeleteModalMember(null);
      await loadMembers();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to delete team member.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleModalDeactivate = async () => {
    if (!deleteModalMember) return;
    setIsDeleting(true);
    try {
      await setTeamMemberActive(deleteModalMember.id, false);
      toast.success(`Deactivated "${deleteModalMember.name}" — hidden from public site.`);
      setDeleteModalMember(null);
      await loadMembers();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to deactivate member.");
    } finally {
      setIsDeleting(false);
    }
  };

  const isFacultyRole = formData.level === LEVELS.FACULTY_ADVISOR;

  // Helper for tier color badges
  const getTierBadgeClass = (level) => {
    switch (level) {
      case LEVELS.FACULTY_ADVISOR:
        return "badge-faculty";
      case LEVELS.LEADERSHIP:
        return "badge-leadership";
      case LEVELS.CORE:
        return "badge-core";
      case LEVELS.WEB_DEV:
        return "badge-webdev";
      default:
        return "badge-exec";
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Topbar />

        <div className="dashboard-content">
          <div className="admin-team-page">
            {/* 1. Header with Breadcrumb & Primary CTA */}
            <div className="team-header-container">
              <div>
                <div className="team-breadcrumb">
                  <Link to="/admin/dashboard">Dashboard</Link>
                  <span className="team-breadcrumb-sep">/</span>
                  <span>Team Management</span>
                </div>
                <div className="team-title-row">
                  <h1>Team Management</h1>
                  <span className="team-count-badge">
                    <FaUsers /> {members.length} {members.length === 1 ? "Member" : "Members"}
                  </span>
                </div>
                <p className="team-header-desc">
                  Manage faculty coordinators, student leadership, domain leads, executives, and website visibility.
                </p>
              </div>

              <div className="team-header-actions">
                <a
                  href="/team"
                  target="_blank"
                  rel="noreferrer"
                  className="team-btn-secondary"
                  title="Preview public team page"
                >
                  <FaExternalLinkAlt /> View Public Page
                </a>
                <button
                  type="button"
                  className="team-btn-primary"
                  onClick={() => handleOpenDrawer()}
                >
                  <FaPlus /> Add Member
                </button>
              </div>
            </div>

            {/* 2. Interactive Statistics Metrics Bar */}
            <div className="team-stats-grid">
              <div
                className={`team-stat-card stat-all ${activeTab === "ALL" && !hasActiveFilters ? "active-stat" : ""}`}
                onClick={() => {
                  setActiveTab("ALL");
                  setSelectedDept("ALL");
                }}
                title="View all members"
              >
                <div className="team-stat-top">
                  <span className="team-stat-label">Total Roster</span>
                  <div className="team-stat-icon icon-blue">
                    <FaUsers />
                  </div>
                </div>
                <div className="team-stat-value">{stats.total}</div>
                <div className="team-stat-sub">All club team members</div>
              </div>

              <div
                className={`team-stat-card stat-active ${activeTab === "ACTIVE" ? "active-stat" : ""}`}
                onClick={() => setActiveTab("ACTIVE")}
                title="Filter active public members"
              >
                <div className="team-stat-top">
                  <span className="team-stat-label" style={{ color: "#4ade80" }}>
                    Active Public
                  </span>
                  <div className="team-stat-icon icon-green">
                    <FaUserCheck />
                  </div>
                </div>
                <div className="team-stat-value" style={{ color: "#4ade80" }}>
                  {stats.activeCount}
                </div>
                <div className="team-stat-sub">Visible on website</div>
              </div>

              <div
                className={`team-stat-card stat-leadership ${activeTab === "LEADERSHIP" ? "active-stat" : ""}`}
                onClick={() => setActiveTab("LEADERSHIP")}
                title="Filter student leadership"
              >
                <div className="team-stat-top">
                  <span className="team-stat-label" style={{ color: "#facc15" }}>
                    Leadership
                  </span>
                  <div className="team-stat-icon icon-gold">
                    <FaCrown />
                  </div>
                </div>
                <div className="team-stat-value" style={{ color: "#facc15" }}>
                  {stats.leadershipCount}
                </div>
                <div className="team-stat-sub">Presidents &amp; Secs</div>
              </div>

              <div
                className={`team-stat-card stat-core ${activeTab === "CORE" ? "active-stat" : ""}`}
                onClick={() => setActiveTab("CORE")}
                title="Filter core domain leads"
              >
                <div className="team-stat-top">
                  <span className="team-stat-label" style={{ color: "#38bdf8" }}>
                    Core Leads
                  </span>
                  <div className="team-stat-icon icon-cyan">
                    <FaUserTie />
                  </div>
                </div>
                <div className="team-stat-value" style={{ color: "#38bdf8" }}>
                  {stats.coreCount}
                </div>
                <div className="team-stat-sub">Tech, Ops &amp; PR Leads</div>
              </div>

              <div
                className={`team-stat-card stat-exec ${activeTab === "EXECUTIVE" ? "active-stat" : ""}`}
                onClick={() => setActiveTab("EXECUTIVE")}
                title="Filter department executives"
              >
                <div className="team-stat-top">
                  <span className="team-stat-label" style={{ color: "#c084fc" }}>
                    Executives
                  </span>
                  <div className="team-stat-icon icon-purple">
                    <FaAward />
                  </div>
                </div>
                <div className="team-stat-value" style={{ color: "#c084fc" }}>
                  {stats.execCount}
                </div>
                <div className="team-stat-sub">Domain Committee</div>
              </div>

              <div
                className={`team-stat-card stat-webdev ${activeTab === "WEB_DEV" ? "active-stat" : ""}`}
                onClick={() => setActiveTab("WEB_DEV")}
                title="Filter web development team"
              >
                <div className="team-stat-top">
                  <span className="team-stat-label" style={{ color: "#38bdf8" }}>
                    Web Dev
                  </span>
                  <div className="team-stat-icon icon-webdev">
                    <FaLaptopCode />
                  </div>
                </div>
                <div className="team-stat-value" style={{ color: "#38bdf8" }}>
                  {stats.webDevCount}
                </div>
                <div className="team-stat-sub">Web Development Team</div>
              </div>

              <div
                className={`team-stat-card stat-faculty ${activeTab === "FACULTY" ? "active-stat" : ""}`}
                onClick={() => setActiveTab("FACULTY")}
                title="Filter faculty advisor"
              >
                <div className="team-stat-top">
                  <span className="team-stat-label" style={{ color: "#f472b6" }}>
                    Faculty
                  </span>
                  <div className="team-stat-icon icon-pink">
                    <FaChalkboardTeacher />
                  </div>
                </div>
                <div className="team-stat-value" style={{ color: "#f472b6" }}>
                  {stats.facultyCount}
                </div>
                <div className="team-stat-sub">Faculty Coordinator</div>
              </div>
            </div>

            {/* 3. Controls Bar: Search, Category Tabs, Dept filter, and View toggle */}
            <div className="team-controls-panel">
              {/* Category Filter Tabs */}
              <div className="team-controls-top">
                <div className="team-filter-tabs">
                  {[
                    { id: "ALL", label: "All" },
                    { id: "LEADERSHIP", label: "Leadership" },
                    { id: "CORE", label: "Core Leads" },
                    { id: "EXECUTIVE", label: "Executives" },
                    { id: "WEB_DEV", label: "Web Dev" },
                    { id: "FACULTY", label: "Faculty" },
                    { id: "ACTIVE", label: "Active" },
                    { id: "INACTIVE", label: "Inactive" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      className={`team-tab-btn ${activeTab === tab.id ? "active" : ""}`}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <span>{tab.label}</span>
                      <span className="team-tab-count">{getTabCount(tab.id)}</span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={loadMembers}
                  className="team-btn-secondary"
                  style={{ padding: "7px 12px", fontSize: "12px" }}
                  title="Refresh team members from database"
                >
                  <FaRedo /> Refresh
                </button>
              </div>

              {/* Search, Department Filter, and View Mode Toggle */}
              <div className="team-controls-bottom">
                <div className="team-search-dept-wrap">
                  <div className="team-search-box">
                    <FaSearch className="team-search-icon" />
                    <input
                      type="text"
                      className="team-search-input"
                      placeholder="Search member name, role, department, bio..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        className="team-search-clear"
                        onClick={() => setSearchTerm("")}
                        title="Clear search query"
                      >
                        <FaTimes />
                      </button>
                    )}
                  </div>

                  <select
                    className="team-dept-select"
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    title="Filter by Department / Vertical"
                  >
                    <option value="ALL">All Departments</option>
                    {DEPARTMENT_OPTIONS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="team-view-actions">
                  {hasActiveFilters && (
                    <button
                      type="button"
                      className="team-reset-btn"
                      onClick={handleResetFilters}
                      title="Clear all active filters"
                    >
                      <FaFilter /> Reset Filters
                    </button>
                  )}

                  <div className="team-view-toggle">
                    <button
                      type="button"
                      className={`team-view-btn ${viewMode === "grid" ? "active" : ""}`}
                      onClick={() => setViewMode("grid")}
                      title="Grid Card View"
                    >
                      <FaThLarge />
                    </button>
                    <button
                      type="button"
                      className={`team-view-btn ${viewMode === "table" ? "active" : ""}`}
                      onClick={() => setViewMode("table")}
                      title="Table List View"
                    >
                      <FaList />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Content Listing (Loading Skeleton, Empty State, Grid View, or Table View) */}
            {loading ? (
              <div className="team-skeleton-grid">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="team-skeleton-card">
                    <div className="team-skeleton-img skeleton-shimmer" />
                    <div className="team-skeleton-body">
                      <div className="team-skeleton-line skeleton-shimmer" style={{ width: "60%" }} />
                      <div className="team-skeleton-line skeleton-shimmer" style={{ width: "85%" }} />
                      <div className="team-skeleton-line skeleton-shimmer" style={{ width: "40%" }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="team-empty-state">
                <div className="team-empty-icon">
                  <FaUsers />
                </div>
                <h3 className="team-empty-title">
                  {hasActiveFilters ? "No matching team members" : "No team members found"}
                </h3>
                <p className="team-empty-desc">
                  {hasActiveFilters
                    ? "Try adjusting your search terms, changing the department, or resetting filters."
                    : "Get started by adding faculty advisors, student leadership, domain leads, and executive team members."}
                </p>
                {hasActiveFilters ? (
                  <button
                    type="button"
                    className="team-btn-secondary"
                    onClick={handleResetFilters}
                  >
                    Clear All Filters
                  </button>
                ) : (
                  <button
                    type="button"
                    className="team-btn-primary"
                    onClick={() => handleOpenDrawer()}
                  >
                    <FaPlus /> Add First Member
                  </button>
                )}
              </div>
            ) : viewMode === "grid" ? (
              /* GRID VIEW */
              <div className="team-members-grid">
                {filteredMembers.map((member) => {
                  const isActive = member.active !== false;
                  const tierClass = getTierBadgeClass(member.level);

                  return (
                    <div
                      key={member.id}
                      className={`team-card ${!isActive ? "inactive-card" : ""}`}
                    >
                      {/* Image & Header Badges */}
                      <div className="team-card-image-wrap">
                        {member.image ? (
                          <img
                            src={member.image}
                            alt={member.name}
                            className="team-card-img"
                            loading="lazy"
                          />
                        ) : (
                          <div className="team-card-avatar-fallback">
                            <FaUserTie />
                          </div>
                        )}

                        {/* Tier Badge */}
                        <span className={`team-badge-tier ${tierClass}`}>
                          {LEVEL_LABELS[member.level] || member.level}
                        </span>

                        {/* Status Badge */}
                        <span
                          className={`team-badge-status ${
                            isActive ? "status-active" : "status-inactive"
                          }`}
                        >
                          <span className="team-badge-status-dot" />
                          {isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </div>

                      {/* Card Body */}
                      <div className="team-card-body">
                        <div className="team-card-meta-row">
                          <span className="team-dept-pill">
                            {member.department || "General"}
                          </span>
                          <span className="team-order-pill">Order: #{member.order ?? 99}</span>
                        </div>

                        <h3 className="team-card-name">{member.name}</h3>
                        <div className="team-card-role">{member.role}</div>

                        {member.bio ? (
                          <p className="team-card-bio">{member.bio}</p>
                        ) : (
                          <div style={{ minHeight: "18px" }} />
                        )}

                        <div className="team-card-socials">
                          {member.email && (
                            <a
                              href={`mailto:${member.email}`}
                              className="team-email-link"
                              title={`Email: ${member.email}`}
                            >
                              <FaEnvelope style={{ marginRight: "4px" }} />
                              {member.email}
                            </a>
                          )}

                          <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
                            {member.linkedin && (
                              <a
                                href={member.linkedin}
                                target="_blank"
                                rel="noreferrer"
                                className="team-social-icon-btn"
                                title={`LinkedIn: ${member.linkedin}`}
                              >
                                <FaLinkedin />
                              </a>
                            )}
                            {member.github && (
                              <a
                                href={member.github}
                                target="_blank"
                                rel="noreferrer"
                                className="team-social-icon-btn"
                                title={`GitHub: ${member.github}`}
                              >
                                <FaGithub />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions Footer */}
                      <div className="team-card-footer">
                        <button
                          type="button"
                          className={`team-toggle-active-btn ${
                            isActive ? "btn-is-active" : "btn-is-inactive"
                          }`}
                          onClick={(e) => handleToggleActive(member, e)}
                          disabled={statusUpdatingId === member.id}
                          title={isActive ? "Deactivate member" : "Activate member"}
                        >
                          {isActive ? <FaToggleOn /> : <FaToggleOff />}
                          <span>{isActive ? "Active" : "Hidden"}</span>
                        </button>

                        <div className="team-action-buttons">
                          <button
                            type="button"
                            className="team-action-edit-btn"
                            onClick={() => handleOpenDrawer(member)}
                            title="Edit member details"
                          >
                            <FaEdit /> Edit
                          </button>
                          <button
                            type="button"
                            className="team-action-delete-btn"
                            onClick={(e) => openDeleteModal(member, e)}
                            title="Delete or deactivate member"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* TABLE VIEW */
              <div className="team-table-container">
                <div className="team-table-wrap">
                  <table className="team-data-table">
                    <thead>
                      <tr>
                        <th>Member</th>
                        <th>Role &amp; Tier</th>
                        <th>Department</th>
                        <th>Order</th>
                        <th>Status</th>
                        <th>Profiles</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMembers.map((member) => {
                        const isActive = member.active !== false;
                        const tierClass = getTierBadgeClass(member.level);

                        return (
                          <tr
                            key={member.id}
                            className={!isActive ? "inactive-row" : ""}
                          >
                            <td>
                              <div className="team-table-member-cell">
                                {member.image ? (
                                  <img
                                    src={member.image}
                                    alt={member.name}
                                    className="team-table-thumb"
                                  />
                                ) : (
                                  <div className="team-table-thumb-fallback">
                                    <FaUserTie />
                                  </div>
                                )}
                                <div className="team-table-name-wrap">
                                  <span className="team-table-name">{member.name}</span>
                                  {member.email && (
                                    <span className="team-table-email">{member.email}</span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td>
                              <div style={{ fontWeight: "600", color: "#f8fafc" }}>
                                {member.role}
                              </div>
                              <span
                                className={`team-badge-tier ${tierClass}`}
                                style={{
                                  position: "static",
                                  display: "inline-block",
                                  marginTop: "4px",
                                  fontSize: "10px",
                                  padding: "2px 6px",
                                }}
                              >
                                {LEVEL_LABELS[member.level] || member.level}
                              </span>
                            </td>

                            <td>
                              <span className="team-dept-pill">
                                {member.department || "General"}
                              </span>
                            </td>

                            <td>
                              <span className="team-order-pill">#{member.order ?? 99}</span>
                            </td>

                            <td>
                              <button
                                type="button"
                                className={`team-toggle-active-btn ${
                                  isActive ? "btn-is-active" : "btn-is-inactive"
                                }`}
                                onClick={(e) => handleToggleActive(member, e)}
                                disabled={statusUpdatingId === member.id}
                                title={isActive ? "Deactivate member" : "Activate member"}
                              >
                                {isActive ? <FaToggleOn /> : <FaToggleOff />}
                                <span>{isActive ? "Active" : "Hidden"}</span>
                              </button>
                            </td>

                            <td>
                              <div style={{ display: "flex", gap: "6px" }}>
                                {member.linkedin && (
                                  <a
                                    href={member.linkedin}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="team-social-icon-btn"
                                    title={`LinkedIn: ${member.linkedin}`}
                                  >
                                    <FaLinkedin />
                                  </a>
                                )}
                                {member.github && (
                                  <a
                                    href={member.github}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="team-social-icon-btn"
                                    title={`GitHub: ${member.github}`}
                                  >
                                    <FaGithub />
                                  </a>
                                )}
                              </div>
                            </td>

                            <td style={{ textAlign: "right" }}>
                              <div
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                }}
                              >
                                <button
                                  type="button"
                                  className="team-action-edit-btn"
                                  onClick={() => handleOpenDrawer(member)}
                                >
                                  <FaEdit /> Edit
                                </button>
                                <button
                                  type="button"
                                  className="team-action-delete-btn"
                                  onClick={(e) => openDeleteModal(member, e)}
                                >
                                  <FaTrash />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* 5. ADD / EDIT TEAM MEMBER DRAWER */}
          {showDrawer && (
            <>
              <div className="team-drawer-backdrop" onClick={handleCloseDrawer} />

              <div className="team-drawer-panel">
                <div className="team-drawer-header">
                  <div className="team-drawer-title-wrap">
                    <div className="team-drawer-icon">
                      {editingMember ? <FaEdit /> : <FaPlus />}
                    </div>
                    <div>
                      <h2 className="team-drawer-title">
                        {editingMember ? "Edit Team Member" : "Add New Team Member"}
                      </h2>
                      <p className="team-drawer-subtitle">
                        {editingMember
                          ? `Updating profile for ${editingMember.name}`
                          : "Fill out member details and public role."}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="team-drawer-close-btn"
                    onClick={handleCloseDrawer}
                    title="Close form"
                  >
                    <FaTimes />
                  </button>
                </div>

                <form className="team-drawer-body" onSubmit={handleSubmit}>
                  {/* SECTION 1: PROFILE DETAILS */}
                  <div className="team-form-section">
                    <div className="team-form-section-header">
                      <span>01.</span> Profile Details
                    </div>

                    {/* Image Dropzone & Preview */}
                    <div className="team-form-group">
                      <label className="team-form-label">
                        Profile Photo <span className="team-form-required">*</span>
                      </label>

                      <div
                        className={`team-image-uploader ${isDragOver ? "dragover" : ""}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                      >
                        <div className="team-image-preview-box">
                          {imagePreview ? (
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="team-image-preview-img"
                            />
                          ) : (
                            <FaImage className="team-image-placeholder-icon" />
                          )}
                        </div>

                        <div className="team-image-controls">
                          <div className="team-image-buttons">
                            <label className="team-upload-btn-label">
                              <FaUpload /> Upload Image
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileInputChange}
                                style={{ display: "none" }}
                              />
                            </label>

                            {imagePreview && (
                              <button
                                type="button"
                                className="team-image-clear-btn"
                                onClick={handleClearImage}
                              >
                                Clear Photo
                              </button>
                            )}
                          </div>
                          <span className="team-form-hint">
                            {selectedFile
                              ? `Selected: ${selectedFile.name}`
                              : "Drag & drop image or provide a direct image URL below:"}
                          </span>
                        </div>
                      </div>

                      <input
                        type="url"
                        name="image"
                        className="team-form-input"
                        placeholder="https://example.com/photo.jpg"
                        value={formData.image}
                        onChange={handleInputChange}
                        style={{ marginTop: "6px" }}
                      />
                    </div>

                    <div className="team-form-row">
                      <div className="team-form-group">
                        <label className="team-form-label">
                          Full Name <span className="team-form-required">*</span>
                        </label>
                        <input
                          type="text"
                          name="name"
                          className="team-form-input"
                          placeholder="e.g. Virat Mishra"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                        />
                      </div>

                      <div className="team-form-group">
                        <label className="team-form-label">Email Address</label>
                        <input
                          type="email"
                          name="email"
                          className="team-form-input"
                          placeholder="e.g. virat@abhyudaya.org"
                          value={formData.email}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>

                    <div className="team-form-group">
                      <label className="team-form-label">Short Bio / Description</label>
                      <textarea
                        name="bio"
                        className="team-form-textarea"
                        rows="3"
                        placeholder="Brief summary of their focus, responsibilities, or background..."
                        value={formData.bio}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  {/* SECTION 2: ROLE & VERTICAL */}
                  <div className="team-form-section">
                    <div className="team-form-section-header">
                      <span>02.</span> Role &amp; Hierarchy
                    </div>

                    <div className="team-form-group">
                      <label className="team-form-label">Quick Role Preset</label>
                      <select
                        className="team-form-select"
                        value={selectedPreset}
                        onChange={(e) => handlePresetChange(e.target.value)}
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
                        <optgroup label="Web Development Team">
                          <option value="Web Developer">Web Developer</option>
                          <option value="Frontend Developer">Frontend Developer</option>
                          <option value="Full Stack Developer">Full Stack Developer</option>
                        </optgroup>
                        <optgroup label="Department Executives">
                          <option value="Operations Executive">Operations Executive</option>
                          <option value="Technical Executive">Technical Executive</option>
                          <option value="PR Executive">PR Executive</option>
                          <option value="custom">Custom Role / Other Executive</option>
                        </optgroup>
                      </select>
                      <span className="team-form-hint">
                        Selecting a preset automatically sets appropriate tier and department.
                      </span>
                    </div>

                    <div className="team-form-group">
                      <label className="team-form-label">
                        Role / Designation Title <span className="team-form-required">*</span>
                      </label>
                      <input
                        type="text"
                        name="role"
                        className="team-form-input"
                        placeholder="e.g. Technical Lead"
                        value={formData.role}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className="team-form-row">
                      <div className="team-form-group">
                        <label className="team-form-label">
                          Tier Level <span className="team-form-required">*</span>
                        </label>
                        <select
                          name="level"
                          className="team-form-select"
                          value={formData.level}
                          onChange={handleInputChange}
                        >
                          <option value={LEVELS.FACULTY_ADVISOR}>Faculty Advisor</option>
                          <option value={LEVELS.LEADERSHIP}>The Leadership</option>
                          <option value={LEVELS.CORE}>Core Team</option>
                          <option value={LEVELS.EXECUTIVE}>Executive</option>
                          <option value={LEVELS.WEB_DEV}>Web Development Team</option>
                        </select>
                      </div>

                      <div className="team-form-group">
                        <label className="team-form-label">
                          Department / Vertical <span className="team-form-required">*</span>
                        </label>
                        <select
                          name="department"
                          className="team-form-select"
                          value={formData.department}
                          onChange={handleInputChange}
                        >
                          {DEPARTMENT_OPTIONS.map((dept) => (
                            <option key={dept} value={dept}>
                              {dept}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="team-form-row">
                      <div className="team-form-group">
                        <label className="team-form-label">Display Order Priority</label>
                        <input
                          type="number"
                          name="order"
                          className="team-form-input"
                          min="1"
                          placeholder="1, 2, 3..."
                          value={formData.order}
                          onChange={handleInputChange}
                        />
                        <span className="team-form-hint">
                          Lower numbers appear first within the same tier.
                        </span>
                      </div>

                      <div className="team-form-group">
                        <label className="team-form-label">Public Status</label>
                        <select
                          name="active"
                          className="team-form-select"
                          value={formData.active ? "true" : "false"}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              active: e.target.value === "true",
                            }))
                          }
                          style={{
                            color: formData.active ? "#4ade80" : "#f87171",
                            fontWeight: "600",
                          }}
                        >
                          <option value="true">Active (Visible on public site)</option>
                          <option value="false">Inactive (Hidden from public site)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: PUBLIC PROFILE & SOCIAL LINKS */}
                  <div className="team-form-section">
                    <div className="team-form-section-header">
                      <span>03.</span> Public Profile &amp; Social Links
                    </div>

                    <div className="team-form-group">
                      <label className="team-form-label">
                        <FaLinkedin style={{ color: "#0077b5" }} /> LinkedIn Profile URL
                      </label>
                      <input
                        type="url"
                        name="linkedin"
                        className="team-form-input"
                        placeholder="https://www.linkedin.com/in/username"
                        value={formData.linkedin}
                        onChange={handleInputChange}
                      />
                    </div>

                    {!isFacultyRole && (
                      <div className="team-form-group">
                        <label className="team-form-label">
                          <FaGithub style={{ color: "#e2e8f0" }} /> GitHub Profile URL
                        </label>
                        <input
                          type="url"
                          name="github"
                          className="team-form-input"
                          placeholder="https://github.com/username"
                          value={formData.github}
                          onChange={handleInputChange}
                        />
                      </div>
                    )}
                  </div>

                  {/* Drawer Footer Actions */}
                  <div className="team-drawer-footer">
                    <button
                      type="button"
                      className="team-drawer-cancel-btn"
                      onClick={handleCloseDrawer}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="team-drawer-submit-btn"
                      disabled={saving}
                    >
                      {saving ? (
                        "Saving to Firebase..."
                      ) : editingMember ? (
                        "Save Changes"
                      ) : (
                        "Add Team Member"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}

          {/* 6. DELETE / DEACTIVATE CONFIRMATION MODAL */}
          {deleteModalMember && (
            <div
              className="team-modal-backdrop"
              onClick={() => setDeleteModalMember(null)}
            >
              <div
                className="team-modal-box"
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                  <div className="team-modal-icon-wrap modal-icon-danger">
                    <FaExclamationTriangle />
                  </div>
                  <div>
                    <h3 className="team-modal-title">
                      Remove &ldquo;{deleteModalMember.name}&rdquo;?
                    </h3>
                    <p className="team-modal-desc">
                      Choose whether to hide this member from the public website or permanently delete their record.
                    </p>
                  </div>
                </div>

                <div className="team-modal-info-box">
                  <strong>Role:</strong> {deleteModalMember.role} ({deleteModalMember.department || "No Department"})
                  <br />
                  <strong>Current Status:</strong>{" "}
                  <span style={{ color: deleteModalMember.active !== false ? "#4ade80" : "#f87171" }}>
                    {deleteModalMember.active !== false ? "Active (Visible)" : "Inactive (Hidden)"}
                  </span>
                </div>

                <div className="team-modal-actions">
                  <button
                    type="button"
                    className="team-modal-btn-cancel"
                    onClick={() => setDeleteModalMember(null)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>

                  {deleteModalMember.active !== false && (
                    <button
                      type="button"
                      className="team-modal-btn-deactivate"
                      onClick={handleModalDeactivate}
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Updating..." : "Deactivate (Hide)"}
                    </button>
                  )}

                  <button
                    type="button"
                    className="team-modal-btn-danger"
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Delete Permanently"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 7. UNSAVED CHANGES CONFIRMATION MODAL */}
          {showUnsavedModal && (
            <div
              className="team-modal-backdrop"
              onClick={() => setShowUnsavedModal(false)}
            >
              <div
                className="team-modal-box"
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                  <div className="team-modal-icon-wrap modal-icon-warning">
                    <FaExclamationTriangle />
                  </div>
                  <div>
                    <h3 className="team-modal-title">Unsaved Changes</h3>
                    <p className="team-modal-desc">
                      You have unsaved changes in the team member form. Are you sure you want to discard them and close?
                    </p>
                  </div>
                </div>

                <div className="team-modal-actions">
                  <button
                    type="button"
                    className="team-modal-btn-cancel"
                    onClick={() => setShowUnsavedModal(false)}
                  >
                    Keep Editing
                  </button>
                  <button
                    type="button"
                    className="team-modal-btn-danger"
                    onClick={confirmDiscardChanges}
                  >
                    Discard Changes
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
