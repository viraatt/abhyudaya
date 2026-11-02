import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { FiArrowLeft, FiAlertCircle, FiCheckCircle, FiX } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../../Firebase/firebase";
import { useAuth } from "../../context/AuthContext";
import { subscribePoll, computePollStatus } from "../../Firebase/pollService";
import { useToast } from "../../Admin/components/Toast";
import SkeletonLoader from "../../Admin/components/SkeletonLoader";
import { PublicPollCard } from "./Polls";

import "./Polls.css";

export default function PollDetails() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const toast = useToast();

  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribePoll(
      id,
      (data) => {
        if (!data || data.status === "draft" || data.archived || data.status === "archived") {
          setPoll(null);
        } else {
          setPoll(data);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error subscribing to poll:", err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [id]);

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

  const status = poll ? computePollStatus(poll) : "closed";

  return (
    <div className="polls-page" style={{ paddingTop: "120px" }}>
      <Helmet>
        <title>{poll ? `${poll.title} | Campus Poll - Abhyudaya Club` : "Campus Poll | Abhyudaya Club"}</title>
        <meta
          name="description"
          content={poll?.description || "Cast your vote in real-time on Abhyudaya Club's official campus poll."}
        />
        <meta property="og:title" content={poll ? `${poll.title} | Abhyudaya Club` : "Campus Poll"} />
        <meta
          property="og:description"
          content={poll?.description || "Participate in real-time student voting at MPEC Kanpur."}
        />
      </Helmet>

      <div className="polls-container">
        {/* Navigation back */}
        <div style={{ marginBottom: "24px" }}>
          <Link
            to="/polls"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              fontWeight: 600,
              color: "#64748b",
              textDecoration: "none",
            }}
          >
            <FiArrowLeft /> All Campus Polls
          </Link>
        </div>

        {loading ? (
          <SkeletonLoader height={320} count={1} />
        ) : !poll ? (
          <div className="poll-empty-state">
            <div className="poll-empty-icon">
              <FiAlertCircle />
            </div>
            <h3 className="poll-empty-title">Poll Not Found or Inactive</h3>
            <p className="poll-empty-sub">
              This poll either does not exist, has been removed, or is currently unpublished.
            </p>
            <Link to="/polls" className="poll-btn-primary">
              View Active Polls
            </Link>
          </div>
        ) : (
          <PublicPollCard
            poll={poll}
            currentUser={currentUser}
            onOpenAuthModal={() => setAuthModalOpen(true)}
          />
        )}
      </div>

      {/* Voter Authentication Modal */}
      {authModalOpen && (
        <div className="voter-auth-modal-backdrop" onClick={() => setAuthModalOpen(false)}>
          <div className="voter-auth-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="voter-auth-close"
              onClick={() => setAuthModalOpen(false)}
            >
              <FiX />
            </button>

            <div className="voter-auth-icon">
              <FiCheckCircle />
            </div>

            <h3 className="voter-auth-title">Student Verification</h3>
            <p className="voter-auth-subtitle">
              Please sign in with your student Google account to verify your identity and cast your vote.
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
          </div>
        </div>
      )}
    </div>
  );
}
