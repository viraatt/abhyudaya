import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../Firebase/firebase";
import { getActiveStudents } from "../../Firebase/studentService";
import {
  BATCH_SIZE,
  MAX_GMAIL_URL_LENGTH,
  buildBody,
  buildGmailUrl,
  buildSubject,
  chunkArray,
  processEmails,
} from "../../utils/emailBatchUtils";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import "./style/admin.css";
import "./RegistrationOutreach.css";

/** Field names tried (in order) to find an event's registration link. */
const REG_LINK_FIELDS = ["registrationUrl", "registrationLink", "registerLink", "ctaLink"];

function getRegistrationLink(event) {
  if (!event) return "";
  for (const field of REG_LINK_FIELDS) {
    if (event[field] && String(event[field]).trim()) {
      return String(event[field]).trim();
    }
  }
  return "";
}

export default function RegistrationOutreach() {
  /* ── Events ── */
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState(false);

  /* ── Students ── */
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentsError, setStudentsError] = useState(false);

  /* ── Processed recipients / batches ── */
  const [recipients, setRecipients] = useState({ valid: [], invalidCount: 0 });
  const [batches, setBatches] = useState([]);

  /* ── Selected event ── */
  const [selectedEventId, setSelectedEventId] = useState("");
  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) || null,
    [events, selectedEventId]
  );
  const registrationLink = getRegistrationLink(selectedEvent);

  /* ── Email content (editable) ── */
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  /* ── Batch navigation ── */
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const preparedCountRef = useRef(0);

  /* ── Confirmation modal ── */
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  /* ── Status messages ── */
  const [statusMessage, setStatusMessage] = useState(""); // "gmailPrepared" | "allDone"
  const [popupError, setPopupError] = useState("");
  const [oversizeMessage, setOversizeMessage] = useState("");

  const currentBatch = batches[currentBatchIndex] || [];
  const totalRecipients = recipients.valid.length;

  /* ── Load events + students ── */
  const loadData = useCallback(async () => {
    setEventsLoading(true);
    setEventsError(false);

    const fetchEvents = async () => {
      try {
        const snapshot = await getDocs(collection(db, "events"));
        const items = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setEvents(items);
      } catch (err) {
        console.error("Failed to load events:", err);
        setEventsError(true);
      } finally {
        setEventsLoading(false);
      }
    };

    const fetchStudents = async () => {
      try {
        const students = await getActiveStudents();
        const processed = processEmails(students.map((s) => s.email));
        setRecipients(processed);
        setBatches(chunkArray(processed.valid, BATCH_SIZE));
        setCurrentBatchIndex(0);
        preparedCountRef.current = 0;
        setStatusMessage("");
      } catch (err) {
        console.error("Failed to load students:", err);
        setStudentsError(true);
      } finally {
        setStudentsLoading(false);
      }
    };

    await Promise.all([fetchEvents(), fetchStudents()]);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ── Regenerate subject/body when event changes ── */
  useEffect(() => {
    if (selectedEvent) {
      setSubject(buildSubject(selectedEvent.title || "Event"));
      setBody(buildBody(selectedEvent.title || "Event", registrationLink));
      setStatusMessage("");
      setCurrentBatchIndex(0);
      preparedCountRef.current = 0;
    }
    setPopupError("");
    setOversizeMessage("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventId]);

  /* ── Open Gmail for the current (or given) batch ── */
  const prepareBatch = useCallback(
    (batch, batchIndex) => {
      const url = buildGmailUrl(batch, subject, body);

      // URL too large → split this batch into smaller halves
      if (url.length > MAX_GMAIL_URL_LENGTH) {
        const subBatches = chunkArray(batch, Math.ceil(batch.length / 2));
        const nextBatches = [...batches];
        nextBatches.splice(batchIndex, 1, ...subBatches);
        setBatches(nextBatches);
        setOversizeMessage(
          "This batch was too large for a single Gmail compose URL and has been split into smaller batches. Please prepare the current batch again."
        );
        setShowConfirmModal(false);
        return;
      }

      const win = window.open(url, "_blank");

      if (!win) {
        setPopupError(
          "Gmail could not be opened.\n\nPlease allow pop-ups for this website and try again."
        );
        setShowConfirmModal(false);
        return;
      }

      // Success — mark this batch as prepared
      preparedCountRef.current += 1;

      if (preparedCountRef.current >= batches.length) {
        setStatusMessage("allDone");
      } else {
        setStatusMessage("gmailPrepared");
      }

      setPopupError("");
      setOversizeMessage("");
      setShowConfirmModal(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [subject, body, batches]
  );

  const handleConfirmOpen = () => {
    prepareBatch(currentBatch, currentBatchIndex);
  };

  const handleNextBatch = () => {
    setCurrentBatchIndex((i) => Math.min(i + 1, batches.length - 1));
    setStatusMessage("");
    setPopupError("");
  };

  const handleStartAgain = () => {
    setCurrentBatchIndex(0);
    preparedCountRef.current = 0;
    setStatusMessage("");
    setPopupError("");
    setOversizeMessage("");
  };

  /* ── Derived UI state ── */
  const showNoEvents = !eventsLoading && !eventsError && events.length === 0;
  const showNoStudents = !studentsLoading && !studentsError && totalRecipients === 0;
  const hasInvalidCount = recipients.invalidCount > 0;

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Topbar />

        <div className="dashboard-content">
          <div className="ro-page">
            {/* ── Page Header ── */}
            <div className="page-header">
              <div className="page-title">
                <h2>📧 Registration Outreach</h2>
                <p>Prepare event registration emails through Gmail</p>
              </div>
            </div>

            {/* ── Error states with retry ── */}
            {eventsError && (
              <div className="ro-error-box">
                <p>⚠️ Failed to load events.</p>
                <button type="button" className="admin-btn" onClick={loadData}>
                  Retry
                </button>
              </div>
            )}
            {studentsError && (
              <div className="ro-error-box">
                <p>⚠️ Failed to load students.</p>
                <button type="button" className="admin-btn" onClick={loadData}>
                  Retry
                </button>
              </div>
            )}

            {/* ── Event Selection ── */}
            <div className="admin-card ro-section">
              <h3 className="ro-section-title">Event</h3>

              {eventsLoading ? (
                <p className="ro-hint">Loading events...</p>
              ) : showNoEvents ? (
                <p className="ro-hint">No events available.</p>
              ) : (
                <>
                  <select
                    className="admin-input ro-select"
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    aria-label="Select event"
                  >
                    <option value="">Select Event</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title}
                      </option>
                    ))}
                  </select>

                  {selectedEvent && (
                    <div className="ro-reg-link">
                      <span className="ro-label">Registration Link</span>
                      {registrationLink ? (
                        <a
                          href={registrationLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ro-link-value"
                        >
                          {registrationLink}
                        </a>
                      ) : (
                        <p className="ro-warning">
                          This event does not have a registration link.
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── Recipients Summary ── */}
            <div className="admin-card ro-section">
              <h3 className="ro-section-title">Recipients</h3>

              {studentsLoading ? (
                <p className="ro-hint">Loading students...</p>
              ) : showNoStudents ? (
                <p className="ro-hint">No active students found.</p>
              ) : (
                <>
                  <div className="ro-stats">
                    <div className="ro-stat">
                      <span className="ro-stat-value">
                        {eventsLoading ? "—" : totalRecipients + recipients.invalidCount}
                      </span>
                      <span className="ro-stat-label">Active Students</span>
                    </div>
                    <div className="ro-stat">
                      <span className="ro-stat-value">{totalRecipients}</span>
                      <span className="ro-stat-label">Valid Email Addresses</span>
                    </div>
                    <div className="ro-stat">
                      <span className="ro-stat-value">{batches.length}</span>
                      <span className="ro-stat-label">Batches</span>
                    </div>
                  </div>

                  {hasInvalidCount && (
                    <p className="ro-warning ro-invalid-note">
                      {totalRecipients + recipients.invalidCount} active students ·{" "}
                      {totalRecipients} valid email addresses ·{" "}
                      {recipients.invalidCount} invalid/duplicate addresses excluded
                    </p>
                  )}

                  {totalRecipients === 0 && !studentsLoading && (
                    <p className="ro-hint">No valid student email addresses found.</p>
                  )}
                </>
              )}
            </div>

            {/* ── Email Preview ── */}
            {selectedEvent && (
              <div className="admin-card ro-section">
                <h3 className="ro-section-title">Email Preview</h3>

                <div className="ro-field">
                  <label className="ro-label" htmlFor="ro-subject">
                    Subject
                  </label>
                  <input
                    id="ro-subject"
                    type="text"
                    className="admin-input"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>

                <div className="ro-field">
                  <label className="ro-label" htmlFor="ro-body">
                    Message
                  </label>
                  <textarea
                    id="ro-body"
                    className="admin-input ro-body"
                    rows={10}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* ── Batch Actions ── */}
            {selectedEvent &&
              registrationLink &&
              totalRecipients > 0 &&
              batches.length > 0 && (
                <div className="admin-card ro-section">
                  <h3 className="ro-section-title">
                    Batch {currentBatchIndex + 1} of {batches.length}
                  </h3>
                  <p className="ro-recipient-count">
                    {currentBatch.length} recipients
                  </p>

                  {statusMessage === "" && (
                    <button
                      type="button"
                      className="admin-btn ro-primary-btn"
                      onClick={() => {
                        setPopupError("");
                        setOversizeMessage("");
                        setShowConfirmModal(true);
                      }}
                    >
                      Open Gmail & Prepare Batch
                    </button>
                  )}

                  {statusMessage === "gmailPrepared" && (
                    <div className="ro-prepared-box">
                      <p>✅ Gmail compose prepared.</p>
                      <p className="ro-subnote">
                        Remember to click SEND in Gmail.
                      </p>
                      <button
                        type="button"
                        className="admin-btn ro-primary-btn"
                        onClick={handleNextBatch}
                        disabled={currentBatchIndex + 1 >= batches.length}
                      >
                        Next Batch
                      </button>
                    </div>
                  )}

                  {statusMessage === "allDone" && (
                    <div className="ro-prepared-box">
                      <p>🎉 All batches prepared.</p>
                      <p className="ro-subnote">
                        {totalRecipients} recipients prepared across{" "}
                        {batches.length} Gmail batches.
                      </p>
                      <button
                        type="button"
                        className="admin-btn ro-primary-btn"
                        onClick={handleStartAgain}
                      >
                        Start Again
                      </button>
                    </div>
                  )}

                  {popupError && (
                    <p className="ro-warning ro-error-text">{popupError}</p>
                  )}
                  {oversizeMessage && (
                    <p className="ro-warning ro-error-text">{oversizeMessage}</p>
                  )}
                </div>
              )}
          </div>
        </div>
      </div>

      {/* ── Confirmation Modal ── */}
      {showConfirmModal && (
        <div className="ro-modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div
            className="ro-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ro-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="ro-modal-title">Prepare Gmail Email?</h3>

            <div className="ro-modal-row">
              <span className="ro-modal-label">Event:</span>
              <span>{selectedEvent?.title || "—"}</span>
            </div>
            <div className="ro-modal-row">
              <span className="ro-modal-label">Batch:</span>
              <span>
                {currentBatchIndex + 1} of {batches.length}
              </span>
            </div>
            <div className="ro-modal-row">
              <span className="ro-modal-label">Recipients:</span>
              <span>{currentBatch.length}</span>
            </div>

            <p className="ro-modal-note">
              Gmail will open with these recipients in BCC.
              <br />
              You will need to manually click Send.
            </p>

            <div className="ro-modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirmOpen}
              >
                Open Gmail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}