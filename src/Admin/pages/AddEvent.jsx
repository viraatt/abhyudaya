import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import EventForm from "../components/EventForm";
import { useToast } from "../components/Toast";
import { createEvent } from "../../Firebase/eventService";
import { useState } from "react";

import "./style/admin.css";
import "./addEvent.css";

export default function AddEvent() {
  const navigate = useNavigate();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const handleSubmit = useCallback(async (payload) => {
    setSaving(true);
    try {
      await createEvent(payload);
      toast.success(
        payload.status === "Published"
          ? "🚀 Event published successfully!"
          : "💾 Event saved as Draft."
      );
      navigate("/admin/events");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to save event. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [navigate, toast]);

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-main">
        <Topbar />
        <div className="dashboard-content">
          <EventForm
            initialData={null}
            onSubmit={handleSubmit}
            saving={saving}
            pageTitle="📅 Add New Event"
            pageSubtitle="Create a new event and publish it to the public Events page."
          />
        </div>
      </div>
    </div>
  );
}
