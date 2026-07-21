import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import StatCard from "./components/StatCard";

import "./style/admin.css";

export default function Dashboard() {
  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Topbar />

        <div className="dashboard-content">

          <div className="stats-grid">

            <StatCard
              title="Events"
              value="12"
              icon="📅"
            />

            <StatCard
              title="Team Members"
              value="18"
              icon="👥"
            />

            <StatCard
              title="Gallery"
              value="143"
              icon="🖼️"
            />

            <StatCard
              title="Messages"
              value="27"
              icon="📩"
            />

          </div>

        </div>
      </div>
    </div>
  );
}