import { useEffect, useState } from "react";
import { collection, getCountFromServer } from "firebase/firestore";
import { db } from "../../Firebase/firebase";
import { useAuth } from "../../context/AuthContext";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import StatCard from "./components/StatCard";

import "./style/admin.css";

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({
    blogs: 0,
    events: 0,
    team: 0,
    loading: true,
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const [blogsSnap, eventsSnap, teamSnap] = await Promise.all([
          getCountFromServer(collection(db, "blogs")),
          getCountFromServer(collection(db, "events")),
          getCountFromServer(collection(db, "team")),
        ]);

        setStats({
          blogs: blogsSnap.data().count,
          events: eventsSnap.data().count,
          team: teamSnap.data().count,
          loading: false,
        });
      } catch (err) {
        console.error("Error loading count stats:", err);
        setStats((prev) => ({ ...prev, loading: false }));
      }
    }

    loadStats();
  }, []);

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Topbar />

        <div className="dashboard-content">
          <div
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "12px",
              marginBottom: "20px",
            }}
          >
            <h2>Welcome Back, {currentUser?.name || "Admin"}</h2>
            <p style={{ color: "#64748b", marginTop: "4px" }}>
              <strong>Email:</strong> {currentUser?.email} | <strong>Role:</strong> {currentUser?.role}
            </p>
          </div>

          <div className="stats-grid">
            <StatCard
              title="Total Blogs"
              value={stats.loading ? "..." : String(stats.blogs)}
              icon="✍️"
            />

            <StatCard
              title="Total Events"
              value={stats.loading ? "..." : String(stats.events)}
              icon="📅"
            />

            <StatCard
              title="Team Members"
              value={stats.loading ? "..." : String(stats.team)}
              icon="👥"
            />
          </div>
        </div>
      </div>
    </div>
  );
}