import { Link, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../../Firebase/firebase";
import { useAuth } from "../../../context/AuthContext";
import { ROLES, normalizeRole } from "../../config/roles";

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/admin/login", { replace: true });
    } catch (err) {
      console.error("[Sidebar] logout error:", err);
    }
  };

  const menus = {
    [ROLES.SUPER_ADMIN]: [
      { name: "Dashboard", path: "/admin/dashboard", icon: "📊" },
      { name: "Events", path: "/admin/events", icon: "📅" },
      { name: "Certificates", path: "/admin/certificates", icon: "📜" },
      { name: "Registrations", path: "/admin/registrations", icon: "📋" },
      { name: "Time Capsules", path: "/admin/time-capsules", icon: "📦" },
      { name: "Announcements", path: "/admin/announcements", icon: "📢" },
      { name: "Students", path: "/admin/students", icon: "👨‍🎓" },
      { name: "Registration Outreach", path: "/admin/registration-outreach", icon: "📧" },
      { name: "Blogs", path: "/admin/blogs", icon: "📝" },
      { name: "Media Library", path: "/admin/media", icon: "📁" },
      { name: "Team", path: "/admin/team", icon: "👥" },
      { name: "Gallery", path: "/admin/gallery", icon: "🖼️" },
      { name: "Contact", path: "/admin/contact", icon: "📩" },
      { name: "Reviews", path: "/admin/reviews", icon: "⭐" },
      { name: "Users", path: "/admin/users", icon: "👤" },
    ],

    [ROLES.BLOG_ADMIN]: [
      { name: "Blogs", path: "/admin/blogs", icon: "📝" },
    ],

    [ROLES.EVENT_ADMIN]: [
      { name: "Events", path: "/admin/events", icon: "📅" },
      { name: "Certificates", path: "/admin/certificates", icon: "📜" },
      { name: "Registrations", path: "/admin/registrations", icon: "📋" },
      { name: "Time Capsules", path: "/admin/time-capsules", icon: "📦" },
      { name: "Announcements", path: "/admin/announcements", icon: "📢" },
      { name: "Students", path: "/admin/students", icon: "👨‍🎓" },
      { name: "Registration Outreach", path: "/admin/registration-outreach", icon: "📧" },
      { name: "Gallery", path: "/admin/gallery", icon: "🖼️" },
      { name: "Media Library", path: "/admin/media", icon: "📁" },
    ],
  };

  const currentRole = normalizeRole(currentUser?.role);
  const menu = menus[currentRole] || [];

  const roleLabel = {
    [ROLES.SUPER_ADMIN]: "Super Admin",
    [ROLES.BLOG_ADMIN]: "Blog Admin",
    [ROLES.EVENT_ADMIN]: "Event Admin",
  };

  return (
    <aside className="sidebar">

      <div className="sidebar-header">

        <h2 className="sidebar-title">
          Abhyudaya
        </h2>

        <p className="sidebar-role">
          {roleLabel[currentRole] || "Admin"}
        </p>

      </div>

      <nav className="sidebar-menu" aria-label="Admin Menu">
        {menu.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== "/admin/dashboard" &&
              location.pathname.startsWith(item.path + "/"));

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-link ${isActive ? "active" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              <span>{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={handleLogout}
          className="sidebar-link sidebar-logout-btn"
          aria-label="Logout"
        >
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </nav>

    </aside>
  );
}