import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import PageHero from "../../components/PageHero.jsx";
import { getCertificateById } from "../../Firebase/certificateService.js";
import "./VerifyCertificate.css";

const SITE_URL = "https://www.abhyudayaclub.in";

export default function VerifyCertificate() {
  const { certificateId } = useParams();
  const [loading, setLoading] = useState(true);
  const [certificate, setCertificate] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setNotFound(false);

    getCertificateById(certificateId)
      .then((cert) => {
        if (!isMounted) return;
        if (cert) {
          setCertificate(cert);
        } else {
          setNotFound(true);
        }
      })
      .catch((err) => {
        console.error("Verification error:", err);
        if (isMounted) setNotFound(true);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [certificateId]);

  const verifyUrl = `${window.location.origin}/verify/${certificateId}`;
  const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=10&data=${encodeURIComponent(
    verifyUrl
  )}`;

  return (
    <>
      <Helmet>
        <title>Verify Certificate {certificateId} | Abhyudaya Club</title>
        <meta
          name="description"
          content={`Official certificate verification page for Certificate ID ${certificateId} - Abhyudaya Club MPGI Kanpur.`}
        />
        <link rel="canonical" href={`${SITE_URL}/verify/${certificateId}`} />
      </Helmet>

      <PageHero
        eyebrow="ABHYUDAYA CLUB OFFICIAL VERIFICATION"
        title="Certificate Verification"
        lede={`Verifying Certificate record ID: ${certificateId}`}
      />

      <main className="verify-page">
        <div className="wrap">
          {loading ? (
            <div className="verify-loading-card">
              <span className="verify-spinner" aria-hidden="true" />
              <p>Verifying certificate against official registry...</p>
            </div>
          ) : notFound || !certificate ? (
            <div className="verify-status-card verify-status-card--invalid">
              <div className="verify-icon-wrap verify-icon-wrap--invalid">
                ✕
              </div>
              <h2 className="verify-status-title">Certificate Not Found</h2>
              <p className="verify-status-desc">
                The requested Certificate ID <strong>{certificateId}</strong> does not exist in our official records or has been revoked.
              </p>
              <div className="verify-actions">
                <Link to="/certificate" className="verify-btn verify-btn--primary">
                  Search Certificates →
                </Link>
                <Link to="/" className="verify-btn verify-btn--outline">
                  Return to Home
                </Link>
              </div>
            </div>
          ) : (
            <div className="verify-status-card verify-status-card--valid">
              <div className="verify-header-badge">
                <span className="verify-check-icon">✓</span>
                <span className="verify-status-text">Certificate Verified</span>
              </div>

              <p className="verify-subtitle">
                This document is verified as an authentic, official record issued by Abhyudaya Club, MPGI Kanpur.
              </p>

              <div className="verify-grid">
                <div className="verify-details">
                  <div className="verify-detail-row">
                    <span className="verify-label">Certificate ID</span>
                    <span className="verify-value verify-value--highlight">
                      {certificate.certificateId}
                    </span>
                  </div>

                  <div className="verify-detail-row">
                    <span className="verify-label">Recipient Name</span>
                    <span className="verify-value">{certificate.name}</span>
                  </div>

                  <div className="verify-detail-row">
                    <span className="verify-label">Roll Number</span>
                    <span className="verify-value">{certificate.rollNo}</span>
                  </div>

                  <div className="verify-detail-row">
                    <span className="verify-label">Event Name</span>
                    <span className="verify-value">{certificate.eventName}</span>
                  </div>

                  {certificate.eventDate && (
                    <div className="verify-detail-row">
                      <span className="verify-label">Event Date</span>
                      <span className="verify-value">{certificate.eventDate}</span>
                    </div>
                  )}

                  <div className="verify-detail-row">
                    <span className="verify-label">Certificate Type</span>
                    <span className="verify-badge">{certificate.certificateType}</span>
                  </div>
                </div>

                <div className="verify-qr-box">
                  <img
                    src={qrCodeApiUrl}
                    alt={`QR Code for verification of ${certificate.certificateId}`}
                    className="verify-qr-img"
                    width="180"
                    height="180"
                  />
                  <span className="verify-qr-caption">Scan to Verify</span>
                </div>
              </div>

              <div className="verify-footer-actions">
                <a
                  href={certificate.certificateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="verify-btn verify-btn--primary"
                >
                  📄 View Original Certificate
                </a>

                <a
                  href={certificate.certificateUrl}
                  download={`Certificate_${certificate.certificateId}.pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="verify-btn verify-btn--blue"
                >
                  📥 Download PDF
                </a>

                <Link to="/certificate" className="verify-btn verify-btn--outline">
                  Search Another Certificate
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
