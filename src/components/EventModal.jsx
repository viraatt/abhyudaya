import { useEffect } from "react";
import "./EventModal.css";

export default function EventModal({ event, onClose }) {
  useEffect(() => {
    if (!event) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [event, onClose]);

  if (!event) return null;

  return (
    <div className="event-modal-overlay" onClick={onClose}>
      <div
        className="event-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="event-modal__close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        {event.banner && (
          <img
            src={event.banner}
            alt={event.title}
            className="event-modal-image"
          />
        )}

        <div className="event-modal__header">
          <span className="eyebrow">📅 Club Event</span>

          <h2>{event.title}</h2>

          <p>{event.description}</p>

          <div
            style={{
              marginTop: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              fontSize: "15px",
            }}
          >
            <span>📅 <strong>Date:</strong> {event.date || "TBA"}</span>

            <span>📍 <strong>Location:</strong> {event.location || "TBA"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}