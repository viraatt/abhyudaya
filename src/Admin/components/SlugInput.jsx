import { useState, useEffect, useRef } from "react";
import {
  FaCheckCircle,
  FaExclamationCircle,
  FaSpinner,
  FaSync,
  FaCopy,
  FaCheck,
  FaExternalLinkAlt,
} from "react-icons/fa";
import {
  generateSlug,
  cleanSlugInput,
  validateSlug,
  checkSlugUnique,
} from "../../utils/slug";
import "./SlugInput.css";

const DOMAIN_PREVIEW = "https://abhyudayaclub.in/blog/";

export default function SlugInput({
  title = "",
  slug = "",
  onSlugChange,
  currentBlogId = null,
}) {
  const [isAutoSync, setIsAutoSync] = useState(true);
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState(null); // 'available' | 'taken' | null
  const [validationError, setValidationError] = useState("");
  const [copied, setCopied] = useState(false);

  const prevTitleRef = useRef(title);
  const debounceTimerRef = useRef(null);

  // 1. Auto-generate slug when Title changes (if auto-sync is active)
  useEffect(() => {
    if (isAutoSync && title !== prevTitleRef.current) {
      prevTitleRef.current = title;
      const newSlug = generateSlug(title);
      if (onSlugChange) {
        onSlugChange(newSlug);
      }
    }
  }, [title, isAutoSync, onSlugChange]);

  // 2. Validate and check uniqueness whenever slug changes
  useEffect(() => {
    if (!slug) {
      setValidationError("Slug is required.");
      setAvailability(null);
      setChecking(false);
      return;
    }

    // Format validation
    const validation = validateSlug(slug);
    if (!validation.isValid) {
      setValidationError(validation.message);
      setAvailability(null);
      setChecking(false);
      return;
    } else {
      setValidationError("");
    }

    // Debounced Firestore Unique Check
    setChecking(true);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const isUnique = await checkSlugUnique(slug, currentBlogId);
        setAvailability(isUnique ? "available" : "taken");
      } catch (err) {
        console.error("Slug unique check error:", err);
      } finally {
        setChecking(false);
      }
    }, 450);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [slug, currentBlogId]);

  // Manual Input Handler
  const handleInputChange = (e) => {
    const rawVal = e.target.value;
    const sanitized = cleanSlugInput(rawVal);
    setIsAutoSync(false); // Disable auto-sync once user manually edits
    if (onSlugChange) {
      onSlugChange(sanitized);
    }
  };

  // Regenerate from Title Handler
  const handleRegenerate = () => {
    const freshSlug = generateSlug(title);
    setIsAutoSync(true);
    if (onSlugChange) {
      onSlugChange(freshSlug);
    }
  };

  // Copy Full Link Handler
  const handleCopyLink = () => {
    const fullUrl = `${DOMAIN_PREVIEW}${slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="slug-input-card">
      <div className="slug-input-header">
        <label htmlFor="blog-slug-input" className="slug-label">
          URL Slug
        </label>
        <button
          type="button"
          className={`slug-sync-btn ${isAutoSync ? "active" : ""}`}
          onClick={handleRegenerate}
          title={
            isAutoSync
              ? "Auto-sync with title active. Click to regenerate."
              : "Click to resync slug with title"
          }
        >
          <FaSync className={isAutoSync ? "icon-spin-hover" : ""} />
          {isAutoSync ? "Auto-Synced" : "Sync with Title"}
        </button>
      </div>

      {/* Input Field Container */}
      <div className="slug-input-wrapper">
        <input
          id="blog-slug-input"
          type="text"
          className={`slug-field ${
            validationError
              ? "has-error"
              : availability === "taken"
              ? "is-taken"
              : availability === "available"
              ? "is-available"
              : ""
          }`}
          placeholder="e.g. welcome-freshers-2026"
          value={slug}
          onChange={handleInputChange}
          autoComplete="off"
        />

        {/* Status Indicator Icon */}
        <div className="slug-status-badge">
          {checking ? (
            <FaSpinner className="slug-spinner" title="Checking availability..." />
          ) : validationError ? (
            <FaExclamationCircle className="status-icon invalid" title={validationError} />
          ) : availability === "taken" ? (
            <FaExclamationCircle className="status-icon taken" title="Slug already taken!" />
          ) : availability === "available" ? (
            <FaCheckCircle className="status-icon available" title="Slug is available!" />
          ) : null}
        </div>
      </div>

      {/* Status & Feedback Messages */}
      <div className="slug-feedback">
        {checking && <span className="msg checking">Checking availability in database...</span>}
        {!checking && validationError && (
          <span className="msg error">⚠️ {validationError}</span>
        )}
        {!checking && !validationError && availability === "taken" && (
          <span className="msg taken-warning">
            ⚠️ <strong>"{slug}"</strong> is already used. Consider appending numbers or details.
          </span>
        )}
        {!checking && !validationError && availability === "available" && (
          <span className="msg success">
            ✅ Slug is valid and available for publication.
          </span>
        )}
      </div>

      {/* Slug URL Preview Chip */}
      <div className="slug-preview-box">
        <div className="preview-url-text">
          <span className="domain-prefix">{DOMAIN_PREVIEW}</span>
          <span className="slug-path">{slug || "your-slug-here"}</span>
        </div>

        <button
          type="button"
          className="copy-url-btn"
          onClick={handleCopyLink}
          disabled={!slug || !!validationError}
          title="Copy full URL to clipboard"
        >
          {copied ? <FaCheck style={{ color: "#16a34a" }} /> : <FaCopy />}
          <span>{copied ? "Copied!" : "Copy"}</span>
        </button>
      </div>
    </div>
  );
}
