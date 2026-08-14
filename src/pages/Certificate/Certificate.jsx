import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { searchCertificate } from "../../Firebase/certificateService.js";
import "./Certificate.css";

const SITE_URL = "https://www.abhyudayaclub.in";

export default function Certificate() {
  const [rollNo, setRollNo] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [certificate, setCertificate] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [downloadState, setDownloadState] = useState("idle"); // idle | downloading | downloaded

  // Handle certificate search submit
  const handleSearch = async (e) => {
    e.preventDefault();
    const cleanRoll = rollNo.trim();
    const cleanName = name.trim();

    if (!cleanRoll || !cleanName) {
      setErrorMessage("Please enter both Roll Number and Full Name.");
      return;
    }

    setLoading(true);
    setSearched(true);
    setCertificate(null);
    setErrorMessage("");

    try {
      const result = await searchCertificate(cleanRoll, cleanName);
      if (result) {
        setCertificate(result);
      } else {
        setErrorMessage(
          "We couldn't find a certificate matching those details. Please check your Roll Number and Full Name and try again."
        );
      }
    } catch (err) {
      console.error("Error searching certificate:", err);
      setErrorMessage(
        "Something went wrong while searching for your certificate. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Reset search state to try again
  const handleResetSearch = () => {
    setErrorMessage("");
    setSearched(false);
    setCertificate(null);
  };

  // Download certificate with user feedback
  const handleDownload = (certUrl, certId) => {
    if (!certUrl) return;
    setDownloadState("downloading");

    // Trigger download
    const link = document.createElement("a");
    link.href = certUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.download = `Certificate_${certId || "Abhyudaya"}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloadState("downloaded");
      setTimeout(() => {
        setDownloadState("idle");
      }, 2500);
    }, 800);
  };

  // Modal ESC key listener and body scroll lock
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && showModal) {
        setShowModal(false);
      }
    };

    if (showModal) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showModal]);

  return (
    <>
      <Helmet>
        <title>Official Certificate Portal | Abhyudaya Club</title>
        <meta
          name="description"
          content="Search, verify, view, and download your official event certificates from Abhyudaya Club MPGI Kanpur."
        />
        <link rel="canonical" href={`${SITE_URL}/certificate`} />
      </Helmet>

      {/* ── 1. HERO SECTION ── */}
      <section className="cert-hero">
        <div className="wrap cert-hero-wrap">
          <div className="cert-hero-left">
            <span className="cert-eyebrow">
              <span className="cert-eyebrow-line" aria-hidden="true" />
              ABHYUDAYA CLUB
            </span>
            <h1 className="cert-hero-title">Find Your Certificate</h1>
            <p className="cert-hero-desc">
              Enter your Roll Number and Name to find, view, and download your official event certificate.
            </p>
          </div>

          <div className="cert-hero-right" aria-hidden="true">
            <div className="cert-hero-badge-graphic">
              <svg
                width="140"
                height="140"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="cert-hero-svg"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <path d="M12 18v-6" />
                <path d="m9 15 3 3 3-3" />
                <circle cx="12" cy="13" r="1" />
              </svg>
              <span className="cert-hero-seal">VERIFIED</span>
            </div>
          </div>
        </div>
      </section>

      <main className="cert-portal-page">
        <div className="wrap">

          {/* ── 2. CERTIFICATE SEARCH PORTAL ── */}
          <div className="csp-wrapper">
            {/* Left decorative panel */}
            <div className="csp-panel-left" aria-hidden="true">
              <div className="csp-panel-bg" />
              <div className="csp-seal-ring csp-seal-ring--outer" />
              <div className="csp-seal-ring csp-seal-ring--inner" />
              <svg className="csp-seal-icon" viewBox="0 0 64 64" fill="none">
                <path d="M32 4L36.5 14.5L48 12L43.5 23L54 28L43.5 33L48 44L36.5 41.5L32 52L27.5 41.5L16 44L20.5 33L10 28L20.5 23L16 12L27.5 14.5L32 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                <circle cx="32" cy="28" r="9" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M28 28L31 31L36 25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p className="csp-panel-label">OFFICIAL<br/>CERTIFICATE<br/>PORTAL</p>
              <div className="csp-panel-divider" />
              <div className="csp-panel-trust">
                <div className="csp-trust-row">
                  <span className="csp-trust-dot" />
                  <span>Officially Issued</span>
                </div>
                <div className="csp-trust-row">
                  <span className="csp-trust-dot" />
                  <span>Tamper-Proof</span>
                </div>
                <div className="csp-trust-row">
                  <span className="csp-trust-dot" />
                  <span>Instantly Downloadable</span>
                </div>
              </div>
            </div>

            {/* Right search panel */}
            <div className="csp-panel-right">
              <div className="csp-right-header">
                <div className="csp-icon-badge" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                </div>
                <div>
                  <h2 className="csp-title">Retrieve Your Certificate</h2>
                  <p className="csp-subtitle">Enter details exactly as provided during registration</p>
                </div>
              </div>

              <div className="csp-divider" />

              <form onSubmit={handleSearch} className="csp-form" noValidate>
                <div className="csp-field">
                  <label htmlFor="rollNo" className="csp-label">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <rect x="3" y="4" width="14" height="14" rx="2"/>
                      <path d="M7 9h6M7 12h4"/>
                    </svg>
                    Roll Number
                    <span className="csp-required" aria-hidden="true">*</span>
                  </label>
                  <div className="csp-input-wrap">
                    <input
                      id="rollNo"
                      type="text"
                      className="csp-input"
                      placeholder="e.g. 2301234567"
                      value={rollNo}
                      onChange={(e) => setRollNo(e.target.value)}
                      disabled={loading}
                      required
                      autoComplete="off"
                    />
                    {rollNo.trim() && (
                      <span className="csp-input-check" aria-hidden="true">✓</span>
                    )}
                  </div>
                  <span className="csp-hint">Your university enrollment number</span>
                </div>

                <div className="csp-field">
                  <label htmlFor="studentName" className="csp-label">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <circle cx="10" cy="7" r="3"/>
                      <path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6"/>
                    </svg>
                    Full Name
                    <span className="csp-required" aria-hidden="true">*</span>
                  </label>
                  <div className="csp-input-wrap">
                    <input
                      id="studentName"
                      type="text"
                      className="csp-input"
                      placeholder="e.g. Ishan Shukla"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={loading}
                      required
                      autoComplete="name"
                    />
                    {name.trim() && (
                      <span className="csp-input-check" aria-hidden="true">✓</span>
                    )}
                  </div>
                  <span className="csp-hint">As registered during the event</span>
                </div>

                <button
                  type="submit"
                  className="csp-submit-btn"
                  disabled={loading || !rollNo.trim() || !name.trim()}
                >
                  <span className="csp-btn-content">
                    {loading ? (
                      <>
                        <span className="csp-spinner" aria-hidden="true" />
                        <span>Searching Records…</span>
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <circle cx="9" cy="9" r="5.5"/>
                          <path d="m14 14 2.5 2.5"/>
                        </svg>
                        <span>Find Certificate</span>
                        <span className="csp-btn-arrow">→</span>
                      </>
                    )}
                  </span>
                  <span className="csp-btn-shimmer" aria-hidden="true" />
                </button>

                <p className="csp-form-note">
                  🔒 Your details are used solely to locate your certificate and are never stored.
                </p>
              </form>
            </div>
          </div>

          {/* ── 3. DYNAMIC SEARCH RESULTS SECTION ── */}
          {searched && (
            <div className="cert-results-section" id="cert-results">
              {loading ? (
                <div className="cert-loading-card">
                  <span className="cert-spinner cert-spinner--lg" aria-hidden="true" />
                  <p>Matching details against official registry...</p>
                </div>
              ) : errorMessage ? (
                /* ERROR STATE */
                <div className="cert-error-card" role="alert">
                  <div className="cert-error-icon-wrap">⚠️</div>
                  <h3 className="cert-error-title">Certificate Not Found</h3>
                  <p className="cert-error-desc">{errorMessage}</p>
                  <button
                    type="button"
                    className="cert-btn cert-btn--outline"
                    onClick={handleResetSearch}
                  >
                    Try Again
                  </button>
                </div>
              ) : certificate ? (
                /* ── 4. CERTIFICATE RESULT CARD ── */
                <div className="cert-result-card">
                  <div className="cert-result-top">
                    <div className="cert-status-badge">
                      <span className="cert-check-icon">✓</span>
                      <span>Certificate Found</span>
                    </div>

                    <div className="cert-id-badge">
                      <span className="cert-id-lbl">Certificate ID:</span>
                      <span className="cert-id-val">{certificate.certificateId}</span>
                    </div>
                  </div>

                  <div className="cert-recipient-hero">
                    <span className="cert-recipient-label">RECIPIENT NAME</span>
                    <h3 className="cert-recipient-name">{certificate.name}</h3>
                  </div>

                  <div className="cert-details-grid">
                    <div className="cert-detail-item">
                      <span className="cert-detail-lbl">Roll Number</span>
                      <span className="cert-detail-val">{certificate.rollNo}</span>
                    </div>

                    <div className="cert-detail-item">
                      <span className="cert-detail-lbl">Event</span>
                      <span className="cert-detail-val">{certificate.eventName}</span>
                    </div>

                    <div className="cert-detail-item">
                      <span className="cert-detail-lbl">Certificate Type</span>
                      <span className="cert-type-pill">{certificate.certificateType}</span>
                    </div>

                    {certificate.eventDate && (
                      <div className="cert-detail-item">
                        <span className="cert-detail-lbl">Event Date</span>
                        <span className="cert-detail-val">{certificate.eventDate}</span>
                      </div>
                    )}
                  </div>

                  <div className="cert-actions-wrap">
                    <button
                      type="button"
                      className="cert-action-btn cert-action-btn--primary"
                      onClick={() => setShowModal(true)}
                    >
                      📄 View Certificate
                    </button>

                    <button
                      type="button"
                      className="cert-action-btn cert-action-btn--gold"
                      onClick={() => handleDownload(certificate.certificateUrl, certificate.certificateId)}
                      disabled={downloadState === "downloading"}
                    >
                      {downloadState === "downloading" ? (
                        <>
                          <span className="cert-spinner cert-spinner--sm" aria-hidden="true" />
                          Preparing Certificate...
                        </>
                      ) : downloadState === "downloaded" ? (
                        "Certificate Downloaded ✓"
                      ) : (
                        "Download Certificate ↓"
                      )}
                    </button>

                    <Link
                      to={`/verify/${certificate.certificateId}`}
                      className="cert-action-btn cert-action-btn--outline"
                    >
                      🔍 Verify Certificate
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* ── 5. HOW IT WORKS SECTION ── */}
          <section className="cert-how-section">
            <h2 className="cert-section-title">How It Works</h2>
            <div className="cert-how-grid">
              <div className="cert-step-card">
                <span className="cert-step-num">01</span>
                <h3 className="cert-step-heading">Enter Your Details</h3>
                <p className="cert-step-desc">
                  Enter your registered Roll Number and Full Name exactly as provided during event registration.
                </p>
              </div>

              <div className="cert-step-card">
                <span className="cert-step-num">02</span>
                <h3 className="cert-step-heading">Verify Your Certificate</h3>
                <p className="cert-step-desc">
                  Our system securely matches your details against the official Abhyudaya Club registry.
                </p>
              </div>

              <div className="cert-step-card">
                <span className="cert-step-num">03</span>
                <h3 className="cert-step-heading">Download</h3>
                <p className="cert-step-desc">
                  Instantly preview your verified PDF certificate and download it directly to your device.
                </p>
              </div>
            </div>
          </section>

          {/* ── 6. TRUST / OFFICIAL PORTAL SECTION ── */}
          <section className="cert-trust-section">
            <div className="cert-trust-card">
              <div className="cert-trust-header">
                <h3 className="cert-trust-title">Official Certificate Portal</h3>
                <p className="cert-trust-desc">
                  Certificates issued by Abhyudaya Club, Maharana Pratap Engineering College (MPGI Kanpur).
                </p>
              </div>

              <div className="cert-trust-badges">
                <div className="cert-trust-item">
                  <span className="cert-trust-icon">✓</span>
                  <span>Officially Issued</span>
                </div>
                <div className="cert-trust-item">
                  <span className="cert-trust-icon">✓</span>
                  <span>Secure Verification</span>
                </div>
                <div className="cert-trust-item">
                  <span className="cert-trust-icon">✓</span>
                  <span>Download Anytime</span>
                </div>
              </div>
            </div>
          </section>

          {/* ── 7. CAN'T FIND YOUR CERTIFICATE? SUPPORT SECTION ── */}
          <section className="cert-support-section">
            <div className="cert-support-card">
              <h3 className="cert-support-title">Can't find your certificate?</h3>
              <p className="cert-support-desc">
                Make sure your Roll Number and Name match the details used during event registration.
              </p>
              <p className="cert-support-subtext">Still having trouble?</p>
              <Link to="/contact" className="cert-support-btn">
                Contact Abhyudaya Club →
              </Link>
            </div>
          </section>

        </div>
      </main>

      {/* ── 8. CERTIFICATE PREVIEW MODAL ── */}
      {showModal && certificate && (
        <div
          className="cert-modal-backdrop"
          onClick={() => setShowModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cert-modal-title"
        >
          <div
            className="cert-modal-container"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cert-modal-header">
              <div>
                <h3 id="cert-modal-title" className="cert-modal-title">
                  Certificate Preview
                </h3>
                <span className="cert-modal-subtitle">
                  ID: {certificate.certificateId} | {certificate.name}
                </span>
              </div>
              <button
                type="button"
                className="cert-modal-close-btn"
                onClick={() => setShowModal(false)}
                aria-label="Close preview"
              >
                ✕
              </button>
            </div>

            <div className="cert-modal-body">
              <iframe
                src={certificate.certificateUrl}
                title={`Certificate for ${certificate.name}`}
                className="cert-modal-iframe"
              />
            </div>

            <div className="cert-modal-footer">
              <button
                type="button"
                className="cert-btn cert-btn--gold"
                onClick={() => handleDownload(certificate.certificateUrl, certificate.certificateId)}
              >
                Download Certificate ↓
              </button>
              <button
                type="button"
                className="cert-btn cert-btn--outline"
                onClick={() => setShowModal(false)}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
