import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const location = useLocation();

  const menu = [
    { name: "Dashboard", path: "/admin/dashboard", icon: "📊" },
    { name: "Events", path: "/admin/events", icon: "📅" },
    { name: "Blogs", path: "/admin/blogs", icon: "📝" },
    { name: "Team", path: "/admin/team", icon: "👥" },
    { name: "Gallery", path: "/admin/gallery", icon: "🖼️" },
    { name: "Contact", path: "/admin/contact", icon: "📩" },
    { name: "Settings", path: "/admin/settings", icon: "⚙️" },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h2>Abhyudaya</h2>
        <span>Admin Panel</span>
      </div>

      <nav className="sidebar-menu">
        {menu.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar-link ${
              location.pathname === item.path ? "active" : ""
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}