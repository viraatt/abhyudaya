import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import "./style/admin.css";

import {
  getContactMessages,
  updateMessageStatus,
  deleteContactMessage,
} from "./services/contactService";

export default function ContactMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const loadMessages = async () => {
    try {
      setLoading(true);
      const data = await getContactMessages();
      setMessages(data);
    } catch (err) {
      console.error(err);
      alert("Failed to load contact messages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const handleStatusChange = async (msgId, newStatus) => {
    try {
      await updateMessageStatus(msgId, newStatus);
      await loadMessages();
      if (selectedMessage && selectedMessage.id === msgId) {
        setSelectedMessage({ ...selectedMessage, status: newStatus });
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update message status.");
    }
  };

  const handleDelete = async (msg) => {
    if (!window.confirm(`Delete message from ${msg.name}?`)) return;
    try {
      await deleteContactMessage(msg.id);
      if (selectedMessage && selectedMessage.id === msg.id) {
        setSelectedMessage(null);
      }
      await loadMessages();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to delete message.");
    }
  };

  const handleViewMessage = (msg) => {
    setSelectedMessage(msg);
    if (msg.status === "unread") {
      handleStatusChange(msg.id, "read");
    }
  };

  const filteredMessages = messages.filter((m) => {
    if (statusFilter === "all") return true;
    return m.status === statusFilter;
  });

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Topbar />

        <div className="dashboard-content">
          {/* Header */}
          <div className="events-header">
            <div className="events-title">
              <h2>📩 Contact Messages Inbox</h2>
              <p>Review and respond to inquiries submitted by visitors & students.</p>
            </div>
          </div>

          {/* Filter Pills */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
            {["all", "unread", "read", "replied"].map((filter) => (
              <button
                key={filter}
                className="filter-btn"
                style={{
                  background: statusFilter === filter ? "#3b82f6" : "#1e293b",
                  color: "#fff",
                  textTransform: "capitalize",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "20px",
                  cursor: "pointer",
                }}
                onClick={() => setStatusFilter(filter)}
              >
                {filter} {filter === "unread" && `(${messages.filter(m => m.status === 'unread').length})`}
              </button>
            ))}
          </div>

          {/* Messages Table */}
          {loading ? (
            <div className="empty-card">
              <h3>Loading Messages...</h3>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="empty-card">
              <div style={{ fontSize: "70px" }}>📩</div>
              <h3>No Messages Found</h3>
              <p>Inquiries submitted via the Contact form will appear here.</p>
            </div>
          ) : (
            <div className="users-table">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#1e293b", textAlign: "left" }}>
                    <th style={{ padding: "12px" }}>Sender</th>
                    <th style={{ padding: "12px" }}>Subject</th>
                    <th style={{ padding: "12px" }}>Contact</th>
                    <th style={{ padding: "12px" }}>Status</th>
                    <th style={{ padding: "12px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMessages.map((msg) => (
                    <tr
                      key={msg.id}
                      style={{
                        borderBottom: "1px solid #334155",
                        fontWeight: msg.status === "unread" ? "bold" : "normal",
                      }}
                    >
                      <td style={{ padding: "12px" }}>
                        <div>{msg.name}</div>
                        <small style={{ color: "#94a3b8" }}>{msg.email}</small>
                      </td>
                      <td style={{ padding: "12px" }}>{msg.subject || "General Inquiry"}</td>
                      <td style={{ padding: "12px" }}>{msg.phone || msg.email}</td>
                      <td style={{ padding: "12px" }}>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            textTransform: "capitalize",
                            background:
                              msg.status === "unread"
                                ? "rgba(239, 68, 68, 0.2)"
                                : msg.status === "replied"
                                ? "rgba(34, 197, 94, 0.2)"
                                : "rgba(148, 163, 184, 0.2)",
                            color:
                              msg.status === "unread"
                                ? "#f87171"
                                : msg.status === "replied"
                                ? "#4ade80"
                                : "#cbd5e1",
                          }}
                        >
                          {msg.status || "unread"}
                        </span>
                      </td>
                      <td style={{ padding: "12px", display: "flex", gap: "8px" }}>
                        <button
                          className="filter-btn"
                          style={{ background: "#3b82f6", color: "#fff" }}
                          onClick={() => handleViewMessage(msg)}
                        >
                          View
                        </button>
                        <button
                          className="filter-btn"
                          onClick={() => handleDelete(msg)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Message View Modal */}
        {selectedMessage && (
          <div className="modal-overlay" onClick={() => setSelectedMessage(null)}>
            <div
              className="modal"
              style={{ maxWidth: "600px", width: "90%" }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ marginBottom: "8px" }}>{selectedMessage.subject}</h2>
              <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "16px" }}>
                From: <strong>{selectedMessage.name}</strong> (&lt;{selectedMessage.email}&gt;)
                {selectedMessage.phone && ` | Phone: ${selectedMessage.phone}`}
              </div>

              <div
                style={{
                  background: "#0f172a",
                  padding: "16px",
                  borderRadius: "8px",
                  border: "1px solid #334155",
                  lineHeight: "1.6",
                  marginBottom: "20px",
                  whiteSpace: "pre-wrap",
                }}
              >
                {selectedMessage.message}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span>Status:</span>
                  <select
                    value={selectedMessage.status || "read"}
                    onChange={(e) => handleStatusChange(selectedMessage.id, e.target.value)}
                    style={{
                      padding: "6px 12px",
                      background: "#1e293b",
                      color: "#fff",
                      border: "1px solid #334155",
                      borderRadius: "6px",
                    }}
                  >
                    <option value="unread">Unread</option>
                    <option value="read">Read</option>
                    <option value="replied">Replied</option>
                  </select>
                </div>

                <div className="modal-actions">
                  <a
                    href={`mailto:${selectedMessage.email}?subject=Re: ${encodeURIComponent(selectedMessage.subject || "Abhyudaya Club Inquiry")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="save"
                    style={{ textDecoration: "none", display: "inline-block", textAlign: "center" }}
                  >
                    Reply via Email
                  </a>
                  <button
                    className="cancel"
                    onClick={() => setSelectedMessage(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
