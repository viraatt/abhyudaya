import { signOut } from "firebase/auth";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../../../Firebase/firebase";
import { useAuth } from "../../../context/AuthContext";
import { ROLES, normalizeRole } from "../../config/roles";
import { FiLogOut, FiFeather } from "react-icons/fi";
import { extractAuthorName } from "../../../utils/authorHelper";

export default function Topbar({ title, subtitle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  const logout = async () => {
    try {
      await signOut(auth);
      navigate("/admin/login", { replace: true });
    } catch (err) {
      console.error("[Topbar] logout error:", err);
    }
  };

  const currentRole = normalizeRole(currentUser?.role);
  const isAlumni = currentRole === ROLES.ALUMNI;

  const userName =
    extractAuthorName(currentUser, auth.currentUser) ||
    (typeof currentUser?.email === "string" ? currentUser.email.split("@")[0] : "") ||
    "Contributor";

  const userInitial = userName.charAt(0).toUpperCase();

  const isWriteArticle = location.pathname === "/admin/blogs/add";
  const routeTitle = [
    ["/admin/dashboard", "Dashboard"],
    ["/admin/events/add", "Add Event"],
    ["/admin/events", "Events"],
    ["/admin/certificates/create", "Create Certificates"],
    ["/admin/certificates/add", "Create Certificate"],
    ["/admin/certificates", "Certificates"],
    ["/admin/registrations", "Registrations"],
    ["/admin/time-capsules", "Time Capsules"],
    ["/admin/announcements", "Announcements"],
    ["/admin/students", "Students"],
    ["/admin/registration-outreach", "Registration Outreach"],
    ["/admin/blogs/add", isAlumni ? "Write Article" : "Create Blog"],
    ["/admin/blogs/edit/", "Edit Article"],
    ["/admin/blogs", "Blog Manager"],
    ["/admin/alumni-articles/review/", "Review Alumni Article"],
    ["/admin/alumni-articles", "Alumni Articles"],
    ["/admin/media", "Media Library"],
    ["/admin/team", "Team"],
    ["/admin/gallery", "Gallery"],
    ["/admin/contact", "Contact"],
    ["/admin/reviews", "Reviews"],
    ["/admin/users", "Users"],
  ].find(([path]) =>
    path.endsWith("/")
      ? location.pathname.startsWith(path)
      : location.pathname === path || location.pathname.startsWith(`${path}/`)
  )?.[1] || "Dashboard";
  const displayTitle = title || routeTitle;
  const displaySubtitle = subtitle || `Welcome back, ${userName}`;

  return (
    <header className="topbar" aria-label="Dashboard Header">
      <div className="topbar-left">
        <div className="topbar-title-row">
          <h1 className="topbar-title">{displayTitle}</h1>
        </div>
        <p className="topbar-subtitle">{displaySubtitle}</p>
      </div>

      <div className="topbar-right">
        {isAlumni && isWriteArticle && (
          <div className="topbar-context-pill">
            <FiFeather className="pill-icon" />
            <span>Article Draft</span>
          </div>
        )}

        <div className="topbar-profile-chip">
          <div className="topbar-avatar">
            {currentUser?.profilePhoto || currentUser?.photoURL || auth.currentUser?.photoURL ? (
              <img
                src={currentUser.profilePhoto || currentUser.photoURL || auth.currentUser?.photoURL}
                alt={userName}
                className="topbar-avatar-img"
              />
            ) : (
              <span className="topbar-avatar-text">{userInitial}</span>
            )}
          </div>
          <div className="topbar-user-info">
            <span className="topbar-user-name">{userName}</span>
            <span className="topbar-user-email">
              {currentUser?.email || auth.currentUser?.email || ""}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="topbar-logout-btn"
          onClick={logout}
          title="Sign out of dashboard"
          aria-label="Log out"
        >
          <FiLogOut className="logout-icon" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}
