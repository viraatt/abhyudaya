import { useAuth } from "../../context/AuthContext";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import StatCard from "./components/StatCard";

import "./style/admin.css";

export default function Dashboard() {
  const { currentUser } = useAuth();

  console.log("Current User:", currentUser);

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Topbar />

        <div className="dashboard-content">

          {/* Temporary Role Test */}
          <div
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "12px",
              marginBottom: "20px",
            }}
          >
            <h2>Authentication Test</h2>

            <p>
              <strong>Name:</strong> {currentUser?.name}
            </p>

            <p>
              <strong>Email:</strong> {currentUser?.email}
            </p>

            <p>
              <strong>Role:</strong> {currentUser?.role}
            </p>

            <p>
              <strong>UID:</strong> {currentUser?.uid}
            </p>
          </div>

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