import { FiBookOpen, FiCalendar, FiUsers } from "react-icons/fi";

export default function StatCard({ title, value, icon }) {
  const displayIcon = {
    "Total Blogs": <FiBookOpen />,
    "Total Events": <FiCalendar />,
    "Team Members": <FiUsers />,
  }[title] || icon;

  return (
    <div className="stat-card">
      <div className="stat-icon" aria-hidden="true">{displayIcon}</div>

      <div className="stat-title">{title}</div>

      <div className="stat-value">{value}</div>
    </div>
  );
}
