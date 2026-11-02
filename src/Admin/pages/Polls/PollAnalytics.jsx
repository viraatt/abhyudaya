import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  FiArrowLeft,
  FiBarChart2,
  FiUsers,
  FiCheckSquare,
  FiAward,
  FiDownload,
  FiCalendar,
  FiClock,
  FiLock,
  FiRefreshCw,
  FiEye,
  FiExternalLink,
} from "react-icons/fi";
import {
  getAllPolls,
  getPoll,
  getPollVotes,
  exportPollResultsCSV,
  formatPollDateTime,
  computePollStatus,
  toMillis,
} from "../../../Firebase/pollService";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { useToast } from "../../components/Toast";
import SkeletonLoader from "../../components/SkeletonLoader";

import "../style/admin.css";
import "./PollAnalytics.css";

export default function PollAnalytics() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [polls, setPolls] = useState([]);
  const [selectedPollId, setSelectedPollId] = useState(id || "");
  const [currentPoll, setCurrentPoll] = useState(null);
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load all polls for the selector
  useEffect(() => {
    async function loadAll() {
      try {
        const all = await getAllPolls();
        setPolls(all);
        if (!selectedPollId && all.length > 0) {
          setSelectedPollId(all[0].id);
        }
      } catch (err) {
        toast.error("Failed to load poll list: " + err.message);
      }
    }
    loadAll();
  }, [selectedPollId, toast]);

  // Sync selectedPollId when URL param changes
  useEffect(() => {
    if (id) {
      setSelectedPollId(id);
    }
  }, [id]);

  // Load selected poll data and votes
  const loadPollData = async (pollId) => {
    if (!pollId) return;
    setLoading(true);
    try {
      const pollData = await getPoll(pollId);
      setCurrentPoll(pollData);

      // Fetch votes subcollection for submission audit
      const voteList = await getPollVotes(pollId);
      setVotes(voteList);
    } catch (err) {
      toast.error("Failed to load poll analytics: " + err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (selectedPollId) {
      loadPollData(selectedPollId);
    }
  }, [selectedPollId]);

  const handlePollChange = (newId) => {
    setSelectedPollId(newId);
    navigate(`/admin/polls/analytics/${newId}`);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPollData(selectedPollId);
  };

  // Compute analytics metrics
  const analyticsData = useMemo(() => {
    if (!currentPoll) return null;

    const totalVotes = currentPoll.totalVotes || 0;
    const participants = currentPoll.totalParticipants || 0;
    const status = computePollStatus(currentPoll);

    // Options breakdown
    let winningOption = null;
    let maxVotes = -1;

    const optionsStats = (currentPoll.options || []).map((opt) => {
      const count = opt.voteCount || 0;
      const pct = totalVotes > 0 ? ((count / totalVotes) * 100).toFixed(1) : "0.0";
      if (count > maxVotes && count > 0) {
        maxVotes = count;
        winningOption = opt;
      }
      return {
        ...opt,
        voteCount: count,
        percentage: pct,
      };
    });

    return {
      totalVotes,
      participants,
      status,
      winningOption,
      optionsStats,
    };
  }, [currentPoll]);

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="poll-analytics-content">
        <Topbar
          title="Poll Analytics & Reports"
          subtitle="Real-time voting telemetry, demographic participation, and audit log exports"
        />

        {/* Back Link & Header */}
        <div className="poll-header-row" style={{ marginBottom: "20px" }}>
          <div>
            <Link
              to="/admin/polls"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#64748b",
                textDecoration: "none",
                marginBottom: "8px",
              }}
            >
              <FiArrowLeft /> Back to Poll Management
            </Link>
            <h1 style={{ fontSize: "24px", fontWeight: 700, margin: 0, color: "#0f172a" }}>
              Poll Analytics
            </h1>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              type="button"
              className="poll-btn-secondary"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <FiRefreshCw className={refreshing ? "spin" : ""} /> Refresh Data
            </button>

            {currentPoll && (
              <button
                type="button"
                className="poll-btn-primary"
                onClick={() => exportPollResultsCSV(currentPoll, votes)}
              >
                <FiDownload /> Export CSV Report
              </button>
            )}
          </div>
        </div>

        {/* Poll Selector Bar */}
        <div className="analytics-selector-bar">
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#475569" }}>
              Select Active or Past Poll:
            </span>
            <select
              value={selectedPollId}
              onChange={(e) => handlePollChange(e.target.value)}
              className="analytics-poll-select"
              aria-label="Select Poll for Analytics"
            >
              {polls.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.computedStatus?.toUpperCase() || "POLL"})
                </option>
              ))}
            </select>
          </div>

          {currentPoll && (
            <Link
              to={`/polls/${currentPoll.id}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "#c48b18",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                textDecoration: "none",
              }}
            >
              <FiExternalLink /> View Public Poll Page
            </Link>
          )}
        </div>

        {/* Loading Skeletons */}
        {loading ? (
          <SkeletonLoader height={350} count={2} />
        ) : !currentPoll ? (
          <div className="poll-empty-state">
            <h3>No poll selected</h3>
            <p>Please select a poll from the dropdown menu to inspect telemetry.</p>
          </div>
        ) : (
          <>
            {/* Top Stat Cards */}
            <div className="analytics-metrics-grid">
              <div className="analytics-metric-card">
                <div className="analytics-icon-box analytics-icon-participants">
                  <FiUsers />
                </div>
                <div className="analytics-metric-data">
                  <span className="analytics-metric-label">Total Participants</span>
                  <span className="analytics-metric-value">
                    {analyticsData.participants.toLocaleString()}
                  </span>
                  <span className="analytics-metric-sub">Unique verified student voters</span>
                </div>
              </div>

              <div className="analytics-metric-card">
                <div className="analytics-icon-box analytics-icon-votes">
                  <FiCheckSquare />
                </div>
                <div className="analytics-metric-data">
                  <span className="analytics-metric-label">Total Votes Cast</span>
                  <span className="analytics-metric-value">
                    {analyticsData.totalVotes.toLocaleString()}
                  </span>
                  <span className="analytics-metric-sub">
                    {currentPoll.allowMultiple ? "Multiple choices permitted" : "Single-choice ballots"}
                  </span>
                </div>
              </div>

              <div className="analytics-metric-card">
                <div className="analytics-icon-box analytics-icon-winner">
                  <FiAward />
                </div>
                <div className="analytics-metric-data">
                  <span className="analytics-metric-label">
                    {analyticsData.status === "closed" ? "Winning Choice" : "Leading Option"}
                  </span>
                  <span className="analytics-metric-value" style={{ fontSize: "18px" }}>
                    {analyticsData.winningOption ? analyticsData.winningOption.text : "No votes yet"}
                  </span>
                  <span className="analytics-metric-sub">
                    {analyticsData.winningOption
                      ? `${analyticsData.winningOption.voteCount} votes (${analyticsData.totalVotes > 0 ? Math.round((analyticsData.winningOption.voteCount / analyticsData.totalVotes) * 100) : 0}%)`
                      : "Awaiting submissions"}
                  </span>
                </div>
              </div>

              <div className="analytics-metric-card">
                <div className="analytics-icon-box analytics-icon-status">
                  <FiClock />
                </div>
                <div className="analytics-metric-data">
                  <span className="analytics-metric-label">Voting Status</span>
                  <span className="analytics-metric-value" style={{ fontSize: "20px", textTransform: "capitalize" }}>
                    {analyticsData.status}
                  </span>
                  <span className="analytics-metric-sub">
                    {currentPoll.showLiveResults ? "Results Public" : "Results Hidden from Public"}
                  </span>
                </div>
              </div>
            </div>

            {/* Main Visual Distribution & Metadata Grid */}
            <div className="analytics-main-grid">
              {/* Left Column: Option-wise Breakdown */}
              <div className="analytics-card">
                <h3 className="analytics-card-title">
                  <FiBarChart2 style={{ color: "#c48b18" }} /> Option-wise Vote Distribution
                </h3>

                <div className="analytics-option-list">
                  {analyticsData.optionsStats.map((opt) => {
                    const isWinner =
                      analyticsData.winningOption && opt.id === analyticsData.winningOption.id;

                    return (
                      <div key={opt.id} className="analytics-option-item">
                        <div className="analytics-option-header">
                          <div className="analytics-option-name">
                            {opt.imageUrl && (
                              <img
                                src={opt.imageUrl}
                                alt=""
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "6px",
                                  objectFit: "cover",
                                }}
                              />
                            )}
                            <span>{opt.text}</span>
                            {isWinner && (
                              <span className="analytics-winner-badge">
                                <FiAward /> {analyticsData.status === "closed" ? "Winner" : "Leading"}
                              </span>
                            )}
                          </div>

                          <div className="analytics-option-stats">
                            {opt.voteCount} vote{opt.voteCount !== 1 ? "s" : ""} ({opt.percentage}%)
                          </div>
                        </div>

                        <div className="analytics-progress-track">
                          <div
                            className={`analytics-progress-fill ${isWinner ? "winner" : ""}`}
                            style={{ width: `${opt.percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Metadata & Schedule Timeline */}
              <div className="analytics-card">
                <h3 className="analytics-card-title">
                  <FiCalendar style={{ color: "#6366f1" }} /> Poll Metadata & Timeline
                </h3>

                <div className="analytics-timeline-list">
                  <div className="analytics-timeline-item">
                    <div className="analytics-timeline-dot" />
                    <div>
                      <div className="analytics-timeline-label">Created By</div>
                      <div className="analytics-timeline-val">{currentPoll.createdBy || "Administrator"}</div>
                    </div>
                  </div>

                  <div className="analytics-timeline-item">
                    <div className="analytics-timeline-dot" />
                    <div>
                      <div className="analytics-timeline-label">Created At</div>
                      <div className="analytics-timeline-val">{formatPollDateTime(currentPoll.createdAt)}</div>
                    </div>
                  </div>

                  <div className="analytics-timeline-item">
                    <div className="analytics-timeline-dot" />
                    <div>
                      <div className="analytics-timeline-label">Voting Commenced (Start)</div>
                      <div className="analytics-timeline-val">{formatPollDateTime(currentPoll.startAt)}</div>
                    </div>
                  </div>

                  <div className="analytics-timeline-item">
                    <div className="analytics-timeline-dot" />
                    <div>
                      <div className="analytics-timeline-label">Closing Deadline (End)</div>
                      <div className="analytics-timeline-val">{formatPollDateTime(currentPoll.endAt)}</div>
                    </div>
                  </div>

                  <div className="analytics-timeline-item">
                    <div className="analytics-timeline-dot" />
                    <div>
                      <div className="analytics-timeline-label">Ballot Restriction</div>
                      <div className="analytics-timeline-val">
                        {currentPoll.allowMultiple ? "Multiple choice enabled" : "Strict single-choice ballot"}
                      </div>
                    </div>
                  </div>

                  <div className="analytics-timeline-item">
                    <div className="analytics-timeline-dot" />
                    <div>
                      <div className="analytics-timeline-label">Live Results Broadcasting</div>
                      <div className="analytics-timeline-val">
                        {currentPoll.showLiveResults ? "Public Real-Time Enabled" : "Secret until Concluded"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Voter Audit Log Table */}
            <div className="analytics-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 className="analytics-card-title" style={{ margin: 0, borderBottom: "none", paddingBottom: 0 }}>
                  <FiCheckSquare style={{ color: "#10b981" }} /> Voter Submission History ({votes.length} Records)
                </h3>
                <button
                  type="button"
                  className="poll-btn-secondary"
                  style={{ fontSize: "12px", padding: "6px 12px" }}
                  onClick={() => exportPollResultsCSV(currentPoll, votes)}
                >
                  <FiDownload /> Download CSV
                </button>
              </div>

              {votes.length === 0 ? (
                <div style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
                  No votes have been recorded for this poll yet.
                </div>
              ) : (
                <div className="analytics-table-wrap">
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th>Voter ID (Anonymized UID)</th>
                        <th>Options Selected</th>
                        <th>Submission Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {votes.map((v) => {
                        const optionLabels = (v.selectedOptions || [])
                          .map((optId) => {
                            const found = (currentPoll.options || []).find((o) => o.id === optId);
                            return found ? found.text : optId;
                          })
                          .join(", ");

                        return (
                          <tr key={v.id}>
                            <td>
                              <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
                                {v.userId || v.id}
                              </code>
                            </td>
                            <td>
                              <strong>{optionLabels || "—"}</strong>
                            </td>
                            <td>{formatPollDateTime(v.submittedAt)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
