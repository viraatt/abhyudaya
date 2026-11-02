import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  FiCheckCircle,
  FiClock,
  FiLock,
  FiShare2,
  FiAward,
  FiUsers,
  FiLogIn,
  FiLogOut,
  FiAlertCircle,
  FiExternalLink,
  FiCheck,
  FiX,
  FiHelpCircle,
} from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth } from "../../Firebase/firebase";
import { useAuth } from "../../context/AuthContext";
import {
  subscribeAllPolls,
  getUserVote,
  submitVote,
  computePollStatus,
  toMillis,
  formatPollDateTime,
} from "../../Firebase/pollService";
import { useToast } from "../../Admin/components/Toast";
import SkeletonLoader from "../../Admin/components/SkeletonLoader";

import "./Polls.css";

// Countdown Hook
function useCountdown(targetMs) {
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, targetMs - Date.now()));

  useEffect(() => {
    if (!targetMs || targetMs <= Date.now()) {
      setTimeLeft(0);
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, targetMs - Date.now());
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetMs]);

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
  const seconds = Math.floor((timeLeft / 1000) % 60);

  return { timeLeft, days, hours, minutes, seconds, isExpired: timeLeft <= 0 };
}

// Individual Poll Card Component
export function PublicPollCard({ poll, currentUser, onOpenAuthModal }) {
  const toast = useToast();
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [userVote, setUserVote] = useState(null);
  const [loadingVoteState, setLoadingVoteState] = useState(true);
  const [voting, setVoting] = useState(false);
  const [justVoted, setJustVoted] = useState(false);

  const status = computePollStatus(poll);
  const endMs = toMillis(poll.endAt);
  const startMs = toMillis(poll.startAt);
  const countdownTarget = status === "scheduled" ? startMs : endMs;
  const { days, hours, minutes, seconds, isExpired } = useCountdown(countdownTarget);

  const effectiveStatus = (status === "active" && isExpired) ? "closed" : status;

  // Load user vote record if user is logged in
  useEffect(() => {
    let isMounted = true;
    if (currentUser?.uid && poll?.id) {
      getUserVote(poll.id, currentUser.uid).then((res) => {
        if (isMounted) {
          if (res.voted && res.vote) {
            setUserVote(res.vote);
            setSelectedOptions(res.vote.selectedOptions || []);
          } else {
            setUserVote(null);
          }
          setLoadingVoteState(false);
        }
      });
    } else {
      setUserVote(null);
      setLoadingVoteState(false);
    }
    return () => {
      isMounted = false;
    };
  }, [poll.id, currentUser?.uid]);

  // Handle option selection
  const handleToggleOption = (optionId) => {
    if (userVote || effectiveStatus !== "active") return;

    if (poll.allowMultiple) {
      setSelectedOptions((prev) =>
        prev.includes(optionId)
          ? prev.filter((id) => id !== optionId)
          : [...prev, optionId]
      );
    } else {
      setSelectedOptions([optionId]);
    }
  };

  // Submit Vote
  const handleVoteSubmit = async () => {
    if (!currentUser) {
      onOpenAuthModal();
      return;
    }

    if (selectedOptions.length === 0) {
      toast.warning("Please choose an option before submitting your vote.");
      return;
    }

    setVoting(true);
    try {
      await submitVote(poll.id, selectedOptions, currentUser);
      setUserVote({
        userId: currentUser.uid,
        selectedOptions,
        submittedAt: new Date(),
      });
      setJustVoted(true);
      toast.success("Vote recorded successfully! Thank you for participating.");
    } catch (err) {
      toast.error(err.message || "Failed to record vote.");
    } finally {
      setVoting(false);
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/polls/${poll.id}`;
    if (navigator.share) {
      navigator.share({
        title: poll.title,
        text: `Vote on Abhyudaya Club: ${poll.title}`,
        url,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Poll link copied to clipboard!");
    }
  };

  // Telemetry & Results
  const totalVotes = poll.totalVotes || 0;
  const participants = poll.totalParticipants || 0;
  const canSeeResults = poll.showLiveResults || userVote || effectiveStatus === "closed";

  // Determine top option
  let topOptionId = null;
  let maxCount = 0;
  (poll.options || []).forEach((opt) => {
    if ((opt.voteCount || 0) > maxCount) {
      maxCount = opt.voteCount;
      topOptionId = opt.id;
    }
  });

  return (
    <article className="poll-card" id={`poll-${poll.id}`}>
      {/* Header */}
      <div className="poll-card__header">
        <div className="poll-card__top-bar">
          <div className="poll-card__status-badges">
            <span className={`public-status-badge status-${effectiveStatus}`}>
              {effectiveStatus === "active" && (
                <>
                  <span className="polls-live-dot" /> Live Poll
                </>
              )}
              {effectiveStatus === "scheduled" && "Starts Soon"}
              {effectiveStatus === "closed" && "Closed"}
            </span>

            {poll.category && (
              <span className="public-status-badge" style={{ background: "#f8fafc", color: "#475569" }}>
                {poll.category}
              </span>
            )}

            <span className="public-status-badge" style={{ background: "#f8fafc", color: "#64748b" }}>
              {poll.allowMultiple ? "Multi-Choice" : "Single-Choice"}
            </span>
          </div>

          {/* Countdown Clock */}
          {effectiveStatus === "active" && (
            <div className="poll-countdown-box" title="Time remaining before poll closes">
              <FiClock />
              <span>
                Closes in:{" "}
                <strong>
                  {days > 0 && `${days}d `}
                  {String(hours).padStart(2, "0")}h {String(minutes).padStart(2, "0")}m {String(seconds).padStart(2, "0")}s
                </strong>
              </span>
            </div>
          )}

          {effectiveStatus === "scheduled" && (
            <div className="poll-countdown-box">
              <FiClock />
              <span>
                Opens in:{" "}
                <strong>
                  {days > 0 && `${days}d `}
                  {hours}h {minutes}m
                </strong>
              </span>
            </div>
          )}
        </div>

        <h2 className="poll-card__title">{poll.title}</h2>
        {poll.description && <p className="poll-card__description">{poll.description}</p>}
      </div>

      {/* Body / Voting Options */}
      <div className="poll-card__body">
        {/* Post-vote banner */}
        {justVoted && (
          <div className="poll-success-banner">
            <FiCheckCircle style={{ fontSize: "18px", flexShrink: 0 }} />
            <span>Your vote has been officially verified and recorded. Real-time standings are displayed below.</span>
          </div>
        )}

        {userVote && !justVoted && (
          <div className="poll-success-banner" style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}>
            <FiCheckCircle style={{ fontSize: "18px", color: "#16a34a", flexShrink: 0 }} />
            <span>You have cast your vote in this poll.</span>
          </div>
        )}

        <div className="poll-options-container" role="radiogroup" aria-label={poll.title}>
          {(poll.options || []).map((opt) => {
            const isSelected = selectedOptions.includes(opt.id);
            const isUserVotedChoice = userVote?.selectedOptions?.includes(opt.id);
            const isWinner = topOptionId === opt.id && totalVotes > 0;

            const count = opt.voteCount || 0;
            const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;

            return (
              <button
                key={opt.id}
                type="button"
                role={poll.allowMultiple ? "checkbox" : "radio"}
                aria-checked={isSelected}
                disabled={Boolean(userVote) || effectiveStatus !== "active"}
                className={`poll-option-btn ${poll.allowMultiple ? "multi" : "single"} ${
                  isSelected ? "selected" : ""
                } ${userVote ? "has-voted" : ""} ${isUserVotedChoice ? "user-voted-choice" : ""}`}
                onClick={() => handleToggleOption(opt.id)}
              >
                {/* Visual Progress Bar (rendered when user has voted or results are public) */}
                {canSeeResults && (
                  <div
                    className={`poll-option-fill-bg ${isWinner ? "winner" : ""}`}
                    style={{ width: `${percentage}%` }}
                  />
                )}

                {/* Left Side: Option Title & Image */}
                <div className="poll-option-content">
                  <div className="poll-option-indicator">
                    {(isSelected || isUserVotedChoice) && <FiCheck style={{ fontSize: "12px" }} />}
                  </div>

                  {opt.imageUrl && (
                    <img
                      src={opt.imageUrl}
                      alt=""
                      className="poll-option-thumb-img"
                      loading="lazy"
                    />
                  )}

                  <span className="poll-option-label">
                    {opt.text}
                    {isUserVotedChoice && (
                      <span style={{ fontSize: "12px", color: "#16a34a", marginLeft: "8px", fontWeight: 700 }}>
                        (Your Vote)
                      </span>
                    )}
                  </span>
                </div>

                {/* Right Side: Results Percentage (only when authorized) */}
                {canSeeResults && (
                  <div className="poll-option-results-meta">
                    {isWinner && (
                      <span className="poll-winner-crown" title="Leading Choice">
                        <FiAward />
                      </span>
                    )}
                    <span className="poll-percentage-number">{percentage}%</span>
                    <span className="poll-votes-tally">({count})</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="poll-card__actions-bar">
          {!userVote && effectiveStatus === "active" && (
            <>
              {currentUser ? (
                <button
                  type="button"
                  className="poll-submit-btn"
                  disabled={voting || selectedOptions.length === 0}
                  onClick={handleVoteSubmit}
                >
                  <FiCheckCircle />
                  {voting ? "Submitting Vote..." : "Cast Your Vote"}
                </button>
              ) : (
                <button
                  type="button"
                  className="poll-submit-btn btn-auth-prompt"
                  onClick={onOpenAuthModal}
                >
                  <FiLogIn /> Sign In to Vote
                </button>
              )}
            </>
          )}

          {userVote && (
            <button type="button" className="poll-submit-btn btn-voted" disabled>
              <FiCheckCircle /> Vote Submitted
            </button>
          )}

          {effectiveStatus === "closed" && !userVote && (
            <button type="button" className="poll-submit-btn" disabled style={{ background: "#64748b" }}>
              <FiLock /> Voting Closed
            </button>
          )}

          {effectiveStatus === "scheduled" && (
            <button type="button" className="poll-submit-btn" disabled style={{ background: "#d97706" }}>
              <FiClock /> Opens {formatPollDateTime(poll.startAt)}
            </button>
          )}

          <button
            type="button"
            className="poll-share-btn"
            onClick={handleShare}
            aria-label="Share poll"
          >
            <FiShare2 /> Share Poll
          </button>
        </div>

        {/* Secret Results Notice if disabled by admin and not yet voted */}
        {!canSeeResults && (
          <div className="poll-secret-results-banner">
            <FiHelpCircle style={{ color: "#64748b" }} />
            <span>Real-time standings are concealed by the organizer until the poll concludes.</span>
          </div>
        )}
      </div>

      {/* Footer Telemetry */}
      <div className="poll-card__footer">
        <div className="poll-footer-meta">
          <span className="poll-meta-badge-inline">
            <FiUsers /> <strong>{participants}</strong> participant{participants !== 1 ? "s" : ""}
          </span>
          <span className="poll-meta-badge-inline">
            <FiCheckCircle /> <strong>{totalVotes}</strong> total vote{totalVotes !== 1 ? "s" : ""}
          </span>
          <span className="poll-meta-badge-inline">
            <FiClock /> Closes: {formatPollDateTime(poll.endAt)}
          </span>
        </div>

        <Link
          to={`/polls/${poll.id}`}
          style={{
            fontSize: "12.5px",
            color: "#c48b18",
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            textDecoration: "none",
          }}
        >
          Direct Link <FiExternalLink />
        </Link>
      </div>
    </article>
  );
}

export default function Polls() {
  const { currentUser } = useAuth();
  const toast = useToast();

  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState("active");
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Subscribe to real-time polls updates
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeAllPolls(
      (data) => {
        // Filter out drafts and archives from public view
        const publicPolls = (data || []).filter(
          (p) => p.status !== "draft" && !p.archived && p.status !== "archived"
        );
        setPolls(publicPolls);
        setLoading(false);
      },
      (err) => {
        console.error("Public polls listener error:", err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Filtered polls
  const filteredPolls = useMemo(() => {
    return polls.filter((p) => {
      const status = computePollStatus(p);
      if (filterTab === "active") return status === "active";
      if (filterTab === "scheduled") return status === "scheduled";
      if (filterTab === "closed") return status === "closed";
      return true; // "all"
    });
  }, [polls, filterTab]);

  // Tab counts
  const counts = useMemo(() => {
    const c = { all: polls.length, active: 0, scheduled: 0, closed: 0 };
    polls.forEach((p) => {
      const status = computePollStatus(p);
      if (c[status] !== undefined) c[status]++;
    });
    return c;
  }, [polls]);

  // Quick Google Sign In for Voters
  const handleGoogleSignIn = async () => {
    setAuthSubmitting(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
      toast.success("Signed in successfully! You can now cast your vote.");
      setAuthModalOpen(false);
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        toast.error("Sign in failed: " + err.message);
      }
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.info("Signed out.");
    } catch (err) {
      toast.error("Logout failed: " + err.message);
    }
  };

  return (
    <div className="polls-page">
      <Helmet>
        <title>Campus Polls & Live Voting | Abhyudaya Club - MPEC Kanpur</title>
        <meta
          name="description"
          content="Cast your vote on upcoming workshops, technical fests, speaker topics, and club initiatives. Verified, real-time student polling by Abhyudaya Club."
        />
        <meta property="og:title" content="Campus Polls & Live Voting | Abhyudaya Club" />
        <meta
          property="og:description"
          content="Participate in real-time student decision making and polls at Maharana Pratap Engineering College."
        />
      </Helmet>

      {/* Hero Section */}
      <section className="polls-hero">
        <div className="polls-hero__container">
          <div className="polls-hero__badge">
            <span className="polls-live-dot" />
            <span>Campus Voice & Live Polls</span>
          </div>

          <h1 className="polls-hero__title">
            Your Vote Drives <span>Abhyudaya</span>
          </h1>

          <p className="polls-hero__desc">
            Help shape upcoming technical workshops, hackathon themes, and flagship events.
            Every vote is cryptographically verified and counted in real-time.
          </p>

          {/* User Sign In Status Badge */}
          <div className="polls-user-strip">
            {currentUser ? (
              <>
                <div className="polls-user-avatar">
                  {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : "U"}
                </div>
                <span>
                  Signed in as <strong>{currentUser.displayName || currentUser.email}</strong>
                </span>
                <button
                  type="button"
                  className="polls-btn-auth"
                  style={{ background: "#f1f5f9", color: "#475569" }}
                  onClick={handleSignOut}
                >
                  <FiLogOut /> Sign Out
                </button>
              </>
            ) : (
              <>
                <FiUsers style={{ color: "#c48b18" }} />
                <span>Sign in with your student account to vote</span>
                <button
                  type="button"
                  className="polls-btn-auth"
                  onClick={() => setAuthModalOpen(true)}
                >
                  <FiLogIn /> 1-Click Sign In
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Filter Tabs Navigation */}
      <div className="polls-nav-wrap">
        <div className="polls-filter-tabs" role="tablist">
          <button
            type="button"
            className={`polls-filter-btn ${filterTab === "active" ? "active" : ""}`}
            onClick={() => setFilterTab("active")}
          >
            Live Polls <span className="polls-count-pill">{counts.active}</span>
          </button>

          <button
            type="button"
            className={`polls-filter-btn ${filterTab === "all" ? "active" : ""}`}
            onClick={() => setFilterTab("all")}
          >
            All Polls <span className="polls-count-pill">{counts.all}</span>
          </button>

          <button
            type="button"
            className={`polls-filter-btn ${filterTab === "scheduled" ? "active" : ""}`}
            onClick={() => setFilterTab("scheduled")}
          >
            Upcoming <span className="polls-count-pill">{counts.scheduled}</span>
          </button>

          <button
            type="button"
            className={`polls-filter-btn ${filterTab === "closed" ? "active" : ""}`}
            onClick={() => setFilterTab("closed")}
          >
            Past Results <span className="polls-count-pill">{counts.closed}</span>
          </button>
        </div>
      </div>

      {/* Poll Cards List */}
      <main className="polls-container">
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <SkeletonLoader height={280} count={2} />
          </div>
        ) : filteredPolls.length === 0 ? (
          <div className="poll-empty-state" style={{ maxWidth: "600px", margin: "40px auto" }}>
            <div className="poll-empty-icon">
              <FiCheckCircle />
            </div>
            <h3 className="poll-empty-title">
              {filterTab === "active" ? "No Active Polls Right Now" : "No Polls Found"}
            </h3>
            <p className="poll-empty-sub">
              {filterTab === "active"
                ? "There are currently no active live polls. Check back soon or browse past poll results."
                : "Check back later for newly announced student polls."}
            </p>
            {filterTab !== "all" && (
              <button
                type="button"
                className="poll-btn-secondary"
                onClick={() => setFilterTab("all")}
              >
                View All Polls
              </button>
            )}
          </div>
        ) : (
          <div className="polls-grid">
            {filteredPolls.map((poll) => (
              <PublicPollCard
                key={poll.id}
                poll={poll}
                currentUser={currentUser}
                onOpenAuthModal={() => setAuthModalOpen(true)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Voter Authentication Modal */}
      {authModalOpen && (
        <div className="voter-auth-modal-backdrop" onClick={() => setAuthModalOpen(false)}>
          <div className="voter-auth-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="voter-auth-close"
              onClick={() => setAuthModalOpen(false)}
              aria-label="Close"
            >
              <FiX />
            </button>

            <div className="voter-auth-icon">
              <FiCheckCircle />
            </div>

            <h3 className="voter-auth-title">Student Verification</h3>
            <p className="voter-auth-subtitle">
              To guarantee that each student gets one fair vote and prevent ballot manipulation, please authenticate with your student account.
            </p>

            <button
              type="button"
              className="btn-google-sign-in"
              disabled={authSubmitting}
              onClick={handleGoogleSignIn}
            >
              <FcGoogle style={{ fontSize: "20px" }} />
              <span>{authSubmitting ? "Connecting..." : "Continue with Google"}</span>
            </button>

            <div style={{ marginTop: "20px", fontSize: "12px", color: "#94a3b8" }}>
              Your email is used solely to authenticate your ballot. We never spam.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
