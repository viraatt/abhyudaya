import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import EventForm from "../components/EventForm";
import { useToast } from "../components/Toast";
import { createEvent } from "../../Firebase/eventService";
import PublishNotificationModal from "../components/PublishNotificationModal";
import { getEventNotificationPrefill } from "../../services/notifyStudioService";

import "./style/admin.css";
import "./addEvent.css";

export default function AddEvent() {
  const navigate = useNavigate();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [notificationModalData, setNotificationModalData] = useState(null);

  const handleSubmit = useCallback(async (payload) => {
    const { notifyAfterPublish, ...eventPayload } = payload;
    setSaving(true);
    try {
      const newEvent = await createEvent(eventPayload);
      toast.success(
        eventPayload.status === "Published"
          ? "🚀 Event published successfully!"
          : "💾 Event saved as Draft."
      );

      if (notifyAfterPublish && eventPayload.status === "Published") {
        // newEvent may return { id } or just the doc ref — handle both
        const eventId = newEvent?.id || newEvent;
        setNotificationModalData(
          getEventNotificationPrefill({
            id: eventId,
            slug: eventPayload.slug,
            title: eventPayload.title,
            description: eventPayload.shortDescription || eventPayload.description || "",
          })
        );
      } else {
        navigate("/admin/events");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to save event. Please try again.");
      setSaving(false);
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

      {/* Publish Notification Modal */}
      {notificationModalData && (
        <PublishNotificationModal
          prefill={notificationModalData}
          onClose={() => {
            setNotificationModalData(null);
            navigate("/admin/events");
          }}
        />
      )}
    </div>
  );
}
