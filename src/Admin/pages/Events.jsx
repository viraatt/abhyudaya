import { useEffect, useState } from "react";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import "./style/admin.css";

import {
  addEvent,
  getEvents,
  deleteEvent,
} from "./services/firebaseEvent";

export default function Events() {

  const [events, setEvents] = useState([]);

  const [loading, setLoading] = useState(true);

  const [showDrawer, setShowDrawer] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);

  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    location: "",
  });

  /* ==========================
      LOAD EVENTS
  ========================== */

  const loadEvents = async () => {
    try {
      setLoading(true);

      const data = await getEvents();

      setEvents(data);

    } catch (err) {
      console.error(err);
      alert("Unable to load events.");
    }

    setLoading(false);
  };

  useEffect(() => {
    loadEvents();
  }, []);

  /* ==========================
      INPUT
  ========================== */

  const handleChange = (e) => {

    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

  };

  /* ==========================
      FILE
  ========================== */

  const handleFile = (e) => {

    if (e.target.files.length) {

      setSelectedFile(e.target.files[0]);

    }

  };

  /* ==========================
      SAVE EVENT
  ========================== */

  const handleSubmit = async (e) => {

    e.preventDefault();

    if (!formData.title.trim()) {

      alert("Event title required.");

      return;
    }

    setSaving(true);

    try {

      await addEvent(formData, selectedFile); // Cloudinary upload

      await loadEvents();

      setFormData({
        title: "",
        description: "",
        date: "",
        location: "",
      });

      setSelectedFile(null);

      setShowDrawer(false);

      alert("Event Added Successfully");

    } catch (err) {

      console.error(err);

      alert(err.message || "Failed to save event.");

    }

    setSaving(false);

  };

  /* ==========================
      DELETE
  ========================== */

  const handleDelete = async (event) => {

    const ok = window.confirm(
      `Delete "${event.title}" ?`
    );

    if (!ok) return;

    try {

      await deleteEvent(
        event.id,
        event.banner
      );

      await loadEvents();

    } catch (err) {

      console.error(err);

      alert(err.message || "Delete failed.");

    }

  };

  return (
  <div className="dashboard-layout">
    <Sidebar />

    <div className="dashboard-main">
      <Topbar />

      <div className="dashboard-content">

        {/* Header */}
        <div className="events-header">
          <div className="events-title">
            <h2>📅 Events</h2>
            <p>Manage all club events from one place.</p>
          </div>

          <button
            className="add-event-btn"
            onClick={() => setShowDrawer(true)}
          >
            + Add Event
          </button>
        </div>

        {/* Loading */}

        {loading ? (

          <div className="empty-card">
            <h3>Loading Events...</h3>
          </div>

        ) : events.length === 0 ? (

          <div className="empty-card">

            <div style={{ fontSize: "70px" }}>📅</div>

            <h3>No Events Yet</h3>

            <p>Create your first club event.</p>

            <button
              className="add-event-btn"
              onClick={() => setShowDrawer(true)}
            >
              + Add First Event
            </button>

          </div>

        ) : (

          <div className="events-grid">

            {events.map((event) => (

              <div
                className="event-card"
                key={event.id}
              >

                {event.banner && (

                  <img
                    src={event.banner}
                    alt={event.title}
                    className="event-image"
                  />

                )}

                <div className="event-body">

                  <h3>{event.title}</h3>

                  <p>{event.description}</p>

                  <small>{event.date}</small>

                  <br />

                  <small>{event.location}</small>

                  <div
                    style={{
                      marginTop: "15px",
                    }}
                  >

                    <button
                      className="filter-btn"
                      onClick={() =>
                        handleDelete(event)
                      }
                    >
                      Delete
                    </button>

                  </div>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

      {/* Drawer */}

      {showDrawer && (

        <>
          <div
            className="drawer-overlay"
            onClick={() => setShowDrawer(false)}
          />

          <div className="event-drawer">

            <div className="drawer-header">

              <h2>Add Event</h2>

              <button
                className="close-btn"
                onClick={() => setShowDrawer(false)}
              >
                ✕
              </button>

            </div>

            <form
              className="drawer-form"
              onSubmit={handleSubmit}
            >

              <label>Title</label>

              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Event title"
                required
              />

              <label>Description</label>

              <textarea
                rows="5"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Description"
              />

              <label>Date</label>

              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
              />

              <label>Location</label>

              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Location"
              />

              <label>Banner</label>

              <input
                type="file"
                accept="image/*"
                onChange={handleFile}
              />

              <button
                className="add-event-btn"
                type="submit"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : "Save Event"}
              </button>

            </form>

          </div>

        </>

      )}

    </div>

  </div>
);
}