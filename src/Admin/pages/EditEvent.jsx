import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { FaSpinner, FaArrowLeft } from "react-icons/fa";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import EventForm from "../components/EventForm";
import { useToast } from "../components/Toast";
import { getEventById, updateEvent } from "../../Firebase/eventService";

import "./style/admin.css";
import "./addEvent.css";

export default function EditEvent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [loadError, setLoadError]     = useState(null);
  const [saving, setSaving]           = useState(false);

  /* ── Load event from Firestore ── */
  useEffect(() => {
    if (!id) return;

    async function fetchEvent() {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await getEventById(id);
        if (!data) {
          setLoadError("Event not found. It may have been deleted.");
          return;
        }
        setInitialData(data);
      } catch (err) {
        console.error("Failed to load event:", err);
        setLoadError(err.message || "Failed to load event data.");
      } finally {
        setLoading(false);
      }
    }

    fetchEvent();
  }, [id]);

  /* ── Update Firestore ── */
  const handleSubmit = useCallback(async (payload) => {
    setSaving(true);
    try {
      await updateEvent(id, payload);
      toast.success(
        payload.status === "Published"
          ? "✅ Event updated & published!"
          : "💾 Event updated as Draft."
      );
      navigate("/admin/events");
    } catch (err) {
      console.error("Update event error:", err);
      toast.error(err.message || "Failed to update event. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [id, navigate, toast]);

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="dashboard-layout">
        <Sidebar />
        <div className="dashboard-main">
          <Topbar />
          <div className="dashboard-content">
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              minHeight: "50vh", flexDirection: "column", gap: 16,
              color: "#64748b",
            }}>
              <FaSpinner style={{ fontSize: 32, animation: "ae-spin 0.8s linear infinite" }} />
              <p style={{ fontSize: 15, fontWeight: 600 }}>Loading event data…</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Error state ── */
  if (loadError) {
    return (
      <div className="dashboard-layout">
        <Sidebar />
        <div className="dashboard-main">
          <Topbar />
          <div className="dashboard-content">
            <div style={{
              background: "#fff", borderRadius: 16, border: "1px solid #fecaca",
              padding: "48px 32px", textAlign: "center",
              maxWidth: 480, margin: "40px auto",
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
                Could Not Load Event
              </h2>
              <p style={{ color: "#64748b", fontSize: 14, marginBottom: 24 }}>{loadError}</p>
              <Link
                to="/admin/events"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "10px 20px", background: "#2563eb", color: "#fff",
                  borderRadius: 10, fontWeight: 600, textDecoration: "none",
                  fontSize: 14,
                }}
              >
                <FaArrowLeft /> Back to Events
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Form ── */
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-main">
        <Topbar />
        <div className="dashboard-content">
          <EventForm
            initialData={initialData}
            onSubmit={handleSubmit}
            saving={saving}
            pageTitle={`✏️ Edit Event — ${initialData?.title || ""}`}
            pageSubtitle="Update event details and save changes to Firestore."
          />
        </div>
      </div>
    </div>
  );
}
