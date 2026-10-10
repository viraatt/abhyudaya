import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../../Firebase/firebase";
import { useAuth } from "../../../context/AuthContext";
import { extractAuthorName } from "../../../utils/authorHelper";
import { ROLES, normalizeRole } from "../../config/roles";
import {
  FiGrid,
  FiCalendar,
  FiAward,
  FiFileText,
  FiArchive,
  FiBell,
  FiUsers,
  FiSend,
  FiFeather,
  FiFolder,
  FiImage,
  FiMail,
  FiStar,
  FiUser,
  FiLogOut,
  FiBookOpen,
  FiMenu,
  FiX,
} from "react-icons/fi";
import abhyudayaLogo from "../../../assets/logo-120.png";

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/admin/login", { replace: true });
    } catch (err) {
      console.error("[Sidebar] logout error:", err);
    }
  };

  const currentRole = normalizeRole(currentUser?.role);
  const isAlumniWorkspace = currentRole === ROLES.ALUMNI;

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 769px)");
    const closeOnDesktop = (event) => {
      if (event.matches) setMobileMenuOpen(false);
    };
    desktopQuery.addEventListener("change", closeOnDesktop);
    return () => desktopQuery.removeEventListener("change", closeOnDesktop);
  }, []);

  const roleLabel = {
    [ROLES.SUPER_ADMIN]: "Super Admin",
    [ROLES.BLOG_ADMIN]: "Blog Admin",
    [ROLES.EVENT_ADMIN]: "Event Admin",
    [ROLES.ALUMNI]: "Alumni Contributor",
  }[currentRole] || "Contributor";

  const userName =
    extractAuthorName(currentUser) ||
    (typeof currentUser?.email === "string" ? currentUser.email.split("@")[0] : "") ||
    "Contributor";

  const userInitial = userName.charAt(0).toUpperCase();

  const menus = {
    [ROLES.SUPER_ADMIN]: [
      { name: "Dashboard", path: "/admin/dashboard", icon: <FiGrid /> },
      { name: "Events", path: "/admin/events", icon: <FiCalendar /> },
      { name: "Certificates", path: "/admin/certificates", icon: <FiAward /> },
      { name: "Registrations", path: "/admin/registrations", icon: <FiFileText /> },
      { name: "Time Capsules", path: "/admin/time-capsules", icon: <FiArchive /> },
      { name: "Announcements", path: "/admin/announcements", icon: <FiBell /> },
      { name: "Students", path: "/admin/students", icon: <FiUsers /> },
      { name: "Registration Outreach", path: "/admin/registration-outreach", icon: <FiSend /> },
      {
        name: "Blogs",
        path: "/admin/blogs",
        icon: <FiBookOpen />,
        subItems: [
          { name: "All Posts", path: "/admin/blogs" },
          { name: "Published", path: "/admin/blogs?status=Published" },
          { name: "Drafts", path: "/admin/blogs?status=Draft" },
          { name: "Archived", path: "/admin/blogs?status=Archived" },
        ],
      },
      {
        name: "Alumni Articles",
        path: "/admin/alumni-articles",
        icon: <FiFeather />,
        subItems: [
          { name: "Pending", path: "/admin/alumni-articles?status=pending" },
          { name: "Approved", path: "/admin/alumni-articles?status=approved" },
          { name: "Rejected", path: "/admin/alumni-articles?status=rejected" },
        ],
      },
      { name: "Media Library", path: "/admin/media", icon: <FiFolder /> },
      { name: "Team", path: "/admin/team", icon: <FiUsers /> },
      { name: "Gallery", path: "/admin/gallery", icon: <FiImage /> },
      { name: "Contact", path: "/admin/contact", icon: <FiMail /> },
      { name: "Reviews", path: "/admin/reviews", icon: <FiStar /> },
      { name: "Users", path: "/admin/users", icon: <FiUser /> },
    ],

    [ROLES.BLOG_ADMIN]: [
      {
        name: "Blogs",
        path: "/admin/blogs",
        icon: <FiBookOpen />,
        subItems: [
          { name: "All Posts", path: "/admin/blogs" },
          { name: "Published", path: "/admin/blogs?status=Published" },
          { name: "Drafts", path: "/admin/blogs?status=Draft" },
          { name: "Archived", path: "/admin/blogs?status=Archived" },
        ],
      },
      {
        name: "Alumni Articles",
        path: "/admin/alumni-articles",
        icon: <FiFeather />,
        subItems: [
          { name: "Pending", path: "/admin/alumni-articles?status=pending" },
          { name: "Approved", path: "/admin/alumni-articles?status=approved" },
          { name: "Rejected", path: "/admin/alumni-articles?status=rejected" },
        ],
      },
    ],

    [ROLES.EVENT_ADMIN]: [
      { name: "Events", path: "/admin/events", icon: <FiCalendar /> },
      { name: "Certificates", path: "/admin/certificates", icon: <FiAward /> },
      { name: "Registrations", path: "/admin/registrations", icon: <FiFileText /> },
      { name: "Time Capsules", path: "/admin/time-capsules", icon: <FiArchive /> },
      { name: "Announcements", path: "/admin/announcements", icon: <FiBell /> },
      { name: "Students", path: "/admin/students", icon: <FiUsers /> },
      { name: "Registration Outreach", path: "/admin/registration-outreach", icon: <FiSend /> },
      { name: "Gallery", path: "/admin/gallery", icon: <FiImage /> },
      { name: "Media Library", path: "/admin/media", icon: <FiFolder /> },
    ],

    [ROLES.ALUMNI]: [
      { name: "Blogs", path: "/admin/blogs", icon: <FiBookOpen /> },
      { name: "Write Article", path: "/admin/blogs/add", icon: <FiFeather /> },
    ],
  };

  const menu = menus[currentRole] || [];

  return (
    <>
      <div className={`sidebar-mobile-bar${isAlumniWorkspace ? " sidebar-mobile-bar--alumni" : ""}`}>
        <Link to={menu[0]?.path || "/admin/dashboard"} className="sidebar-mobile-brand" aria-label="Abhyudaya Admin Panel">
          <img src={abhyudayaLogo} alt="" />
          <span className="sidebar-mobile-brand-copy">
            <span>Abhyudaya<span className="brand-accent">.</span></span>
            <small>{isAlumniWorkspace ? "Alumni Editorial" : "Admin Panel"}</small>
          </span>
        </Link>
        <button
          type="button"
          className="sidebar-mobile-trigger"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open admin navigation"
          aria-controls="admin-sidebar"
          aria-expanded={mobileMenuOpen}
        >
          <FiMenu aria-hidden="true" />
          <span>Menu</span>
        </button>
      </div>
      {mobileMenuOpen && (
        <button
          type="button"
          className="sidebar-drawer-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close navigation menu"
        />
      )}
      <aside
        id="admin-sidebar"
        className={`sidebar sidebar--mobile-drawer${isAlumniWorkspace ? " sidebar--alumni" : ""}${mobileMenuOpen ? " is-open" : ""}`}
        aria-label={isAlumniWorkspace ? "Alumni Editorial Navigation" : "CMS Navigation"}
      >
      <div className="sidebar-brand-wrapper">
        <Link to="/admin/blogs" className="sidebar-brand-link">
          {isAlumniWorkspace ? (
            <img className="sidebar-brand-logo" src={abhyudayaLogo} alt="Abhyudaya Club" />
          ) : (
            <div className="sidebar-brand-icon">
              <span>A</span>
            </div>
          )}
          <div className="sidebar-brand-text">
            <h2 className="sidebar-title">
              Abhyudaya<span className="brand-accent">.</span>
            </h2>
            <span className="sidebar-brand-sub">
              {isAlumniWorkspace ? "Alumni Editorial" : "Editorial Studio"}
            </span>
          </div>
        </Link>
        {isAlumniWorkspace && <span className="sidebar-context-label">Alumni Contributor</span>}
        <button
          type="button"
          className="sidebar-drawer-close"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close admin navigation"
        >
          <FiX aria-hidden="true" />
        </button>
      </div>

      <nav className="sidebar-menu" aria-label="Main Navigation">
        {!isAlumniWorkspace && <div className="sidebar-menu-label">Menu</div>}
        {menu.map((item) => {
          const isActive =
            isAlumniWorkspace
              ? location.pathname === item.path
              : location.pathname === item.path ||
                (item.path !== "/admin/dashboard" &&
                  location.pathname.startsWith(item.path + "/"));

          return (
            <div key={item.path} className={`sidebar-item-group${isAlumniWorkspace ? " sidebar-item-group--editorial" : ""}`}>
              {isAlumniWorkspace && (
                <div className="sidebar-section-label">
                  {item.name === "Blogs" ? "Articles" : "Contribute"}
                </div>
              )}
              <Link
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`sidebar-link ${isActive ? "active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="sidebar-icon-wrap">{item.icon}</span>
                <span className="sidebar-link-text">{item.name}</span>
                {isActive && !isAlumniWorkspace && <span className="sidebar-active-indicator" />}
              </Link>

              {item.subItems && (
                <div className="sidebar-submenu">
                  {item.subItems.map((sub) => {
                    const isSubActive =
                      location.pathname + location.search === sub.path ||
                      (sub.path === item.path &&
                        location.pathname === item.path &&
                        !location.search);

                    return (
                      <Link
                        key={sub.path + sub.name}
                        to={sub.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`sidebar-sublink ${isSubActive ? "active" : ""}`}
                      >
                        <span className="sublink-bullet">•</span>
                        <span>{sub.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Premium Account Card Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user-card">
          <div className="sidebar-user-avatar">
            {currentUser?.profilePhoto || currentUser?.photoURL ? (
              <img
                src={currentUser.profilePhoto || currentUser.photoURL}
                alt={userName}
                className="sidebar-avatar-img"
              />
            ) : (
              <span className="sidebar-avatar-initials">{userInitial}</span>
            )}
          </div>
          <div className="sidebar-user-meta">
            <span className="sidebar-user-name" title={userName}>
              {userName}
            </span>
            <span className="sidebar-user-role-label">{roleLabel}</span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="sidebar-quick-logout"
            title="Log out"
            aria-label="Logout"
          >
            <FiLogOut />
          </button>
        </div>
      </div>
      </aside>
    </>
  );
}
