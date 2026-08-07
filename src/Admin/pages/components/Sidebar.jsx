import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

export default function Sidebar() {
  const location = useLocation();
  const { currentUser } = useAuth();

  const menus = {
    super_admin: [
      { name: "Dashboard", path: "/admin/dashboard", icon: "📊" },
      { name: "Events", path: "/admin/events", icon: "📅" },
      { name: "Blogs", path: "/admin/blogs", icon: "📝" },
      { name: "Media Library", path: "/admin/media", icon: "📁" },
      { name: "Team", path: "/admin/team", icon: "👥" },
      { name: "Gallery", path: "/admin/gallery", icon: "🖼️" },
      { name: "Contact", path: "/admin/contact", icon: "📩" },
      { name: "Reviews", path: "/admin/reviews", icon: "⭐" },
      { name: "Users", path: "/admin/users", icon: "👤" },
    ],

    blog_admin: [
      { name: "Blogs", path: "/admin/blogs", icon: "📝" },
      { name: "Media Library", path: "/admin/media", icon: "📁" },
    ],

    event_admin: [
      { name: "Events", path: "/admin/events", icon: "📅" },
      { name: "Media Library", path: "/admin/media", icon: "📁" },
    ],
  };

  const menu = menus[currentUser?.role] || [];

  const roleLabel = {
    super_admin: "Super Admin",
    blog_admin: "Blog Admin",
    event_admin: "Event Admin",
  };

  return (
    <aside className="sidebar">

      <div className="sidebar-header">

        <h2 className="sidebar-title">
          Abhyudaya
        </h2>

        <p className="sidebar-role">
          {roleLabel[currentUser?.role] || "Admin"}
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
      </nav>

    </aside>
  );
}