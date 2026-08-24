/**
 * EventForm.jsx — Shared form for Add Event & Edit Event
 * Receives `initialData` (null for Add, object for Edit) and `onSubmit` callback.
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FaCloudUploadAlt,
  FaTrash,
  FaSpinner,
  FaArrowLeft,
  FaPlus,
  FaSave,
  FaPaperPlane,
  FaTimes,
  FaImage,
} from "react-icons/fa";
import { uploadEventImage } from "../../Firebase/eventService";

import "../pages/addEvent.css";

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
export const CATEGORIES = [
  "Flagship Festival",
  "Technical Festival",
  "Communication & Leadership",
  "Space & Innovation",
  "Industry Exposure",
  "Skill Development",
  "Cultural",
  "Sports",
  "Special Event",
  "Other",
];

const EMOJI_OPTIONS = [
  "💻","🎤","🚀","🏭","💡","🎓","🏆","⚽","🎨",
  "📅","🔬","🤖","🌐","📸","🎵","🌟","🔥","🛠️",
];

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function generateSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

/* ─────────────────────────────────────────
   IMAGE UPLOAD FIELD
───────────────────────────────────────── */
function ImageUploadField({ label, value, uploading, onFileChange, onRemove }) {
  return (
    <div className="ae-field">
      <span className="ae-label">{label}</span>

      {uploading && (
        <div className="ae-uploading-indicator">
          <FaSpinner className="ae-spin" />
          Uploading to Cloudinary…
        </div>
      )}

      {!uploading && !value && (
        <div className="ae-image-upload-zone">
          <FaImage className="ae-upload-icon" />
          <p>Click or drag &amp; drop to upload</p>
          <small>PNG, JPG, WebP · Max 10 MB</small>
          <input type="file" accept="image/*" onChange={onFileChange} />
        </div>
      )}

      {!uploading && value && (
        <>
          <div className="ae-image-preview-box">
            <img src={value} alt={label} />
          </div>
          <div className="ae-image-preview-actions">
            <label className="ae-img-action-btn replace">
              <FaCloudUploadAlt />
              <span>Replace</span>
              <input type="file" accept="image/*" onChange={onFileChange} />
            </label>
            <button
              type="button"
              className="ae-img-action-btn remove"
              onClick={onRemove}
            >
              <FaTrash />
              <span>Delete</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN FORM COMPONENT
───────────────────────────────────────── */
export default function EventForm({ initialData, onSubmit, saving, pageTitle, pageSubtitle }) {
  const isEdit = Boolean(initialData);

  /* ── Basic Info ── */
  const [title, setTitle]           = useState(initialData?.title || "");
  const [slugManual, setSlugManual] = useState(initialData?.slug || "");
  const [slugLocked, setSlugLocked] = useState(isEdit); // locked in edit mode by default
  const [category, setCategory]     = useState(initialData?.subtitle || initialData?.category || "Special Event");
  const [tagline, setTagline]       = useState(initialData?.tagline || "");
  const [shortDesc, setShortDesc]   = useState(initialData?.shortDescription || initialData?.description || "");
  const [longDesc, setLongDesc]     = useState(initialData?.longDescription || "");
  const [venue, setVenue]           = useState(initialData?.venue || "");
  const [location, setLocation]     = useState(initialData?.location || "");
  const [organizer, setOrganizer]   = useState(initialData?.organizer || "Abhyudaya Club");
  const [eventStartDate, setEventStartDate] = useState(initialData?.eventStartDate || "");
  const [eventEndDate, setEventEndDate]     = useState(initialData?.eventEndDate || "");
  const [regDeadline, setRegDeadline]       = useState(initialData?.registrationDeadline || "");
  const [maxRegistrations, setMaxRegistrations] = useState(
    initialData?.maxRegistrations ? String(initialData.maxRegistrations) : ""
  );

  /* ── Registration / Pricing ── */
  const [isPaid, setIsPaid] = useState(Boolean(initialData?.isPaid));
  const [feeAmount, setFeeAmount] = useState(
    initialData?.feeAmount ? String(initialData.feeAmount) : ""
  );

  /* ── Derived slug ── */
  const derivedSlug = slugLocked ? slugManual : generateSlug(title);

  const handleTitleChange = (val) => {
    setTitle(val);
    if (!slugLocked) setSlugManual(generateSlug(val));
  };

  /* ── Images ── */
  const [bannerUrl, setBannerUrl]             = useState(initialData?.image || initialData?.banner || "");
  const [thumbUrl, setThumbUrl]               = useState(initialData?.thumbnail || "");
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingThumb, setUploadingThumb]   = useState(false);

  const handleImageUpload = useCallback(async (file, setUrl, setUploading) => {
    if (!file) return;
    try {
      setUploading(true);
      const url = await uploadEventImage(file);
      setUrl(url);
    } catch (err) {
      console.error(err);
      throw err; // let parent's onSubmit error handler catch it
    } finally {
      setUploading(false);
    }
  }, []);

  /* ── Statistics ── */
  const [stats, setStats] = useState({
    participants:      initialData?.participants      || "",
    participantsLabel: initialData?.participantsLabel || "Participants",
    events:            initialData?.events            || "",
    eventsLabel:       initialData?.eventsLabel       || "Activities",
    editions:          initialData?.editions          || "",
    editionsLabel:     initialData?.editionsLabel     || "Editions",
    years:             initialData?.years             || "",
    yearsLabel:        initialData?.yearsLabel        || "Years Active",
    competitions:      initialData?.competitions      || "",
    competitionsLabel: initialData?.competitionsLabel || "Competitions",
  });

  const updateStat = (key, val) =>
    setStats((prev) => ({ ...prev, [key]: val }));

  /* ── Highlights ── */
  const [highlights, setHighlights] = useState(
    initialData?.highlights?.length ? initialData.highlights : ["", "", ""]
  );

  const addHighlight    = () => setHighlights((p) => [...p, ""]);
  const removeHighlight = (i) => setHighlights((p) => p.filter((_, idx) => idx !== i));
  const updateHighlight = (i, val) =>
    setHighlights((p) => p.map((h, idx) => (idx === i ? val : h)));

  /* ── Speakers Management ── */
  const [speakers, setSpeakers] = useState(
    Array.isArray(initialData?.speakers) ? initialData.speakers : []
  );

  const addSpeaker = () => {
    setSpeakers((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: "",
        designation: "",
        company: "",
        bio: "",
        linkedin: "",
        image: "",
        uploading: false,
      },
    ]);
  };

  const removeSpeaker = (index) => {
    setSpeakers((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSpeaker = (index, field, value) => {
    setSpeakers((prev) =>
      prev.map((spk, i) => (i === index ? { ...spk, [field]: value } : spk))
    );
  };

  const handleSpeakerPhotoUpload = async (index, file) => {
    if (!file) return;
    updateSpeaker(index, "uploading", true);
    try {
      const url = await uploadEventImage(file);
      updateSpeaker(index, "image", url);
    } catch (err) {
      console.error("Speaker photo upload error:", err);
    } finally {
      updateSpeaker(index, "uploading", false);
    }
  };

  /* ── Theme ── */
  const [badgeText, setBadgeText]           = useState(initialData?.badgeText || initialData?.subtitle || "");
  const [badgeIcon, setBadgeIcon]           = useState(initialData?.icon || "📅");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [ctaText, setCtaText]               = useState(initialData?.ctaText || "Learn More");
  const [ctaLink, setCtaLink]               = useState(initialData?.ctaLink || "");

  /* ── Publish Options ── */
  const [status, setStatus]     = useState(initialData?.status || "Draft");
  const [featured, setFeatured] = useState(Boolean(initialData?.featured));

  /* ── Validation state ── */
  const [errors, setErrors] = useState({});

  /* Close emoji picker on outside click */
  const emojiRef = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Validate ── */
  const validate = () => {
    const errs = {};
    if (!title.trim())        errs.title = "Event title is required.";
    if (!derivedSlug.trim())  errs.slug  = "Slug is required.";
    if (!shortDesc.trim() && !longDesc.trim())
      errs.description = "At least a short description is required.";

    // Pricing validation
    if (isPaid) {
      const fee = Number(feeAmount);
      if (feeAmount === "" || feeAmount === null || feeAmount === undefined) {
        errs.fee = "Registration fee is required for paid events.";
      } else if (!Number.isFinite(fee)) {
        errs.fee = "Registration fee must be a valid number.";
      } else if (fee < 0) {
        errs.fee = "Registration fee cannot be negative.";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /* ── Build payload ── */
  const buildPayload = useCallback((submitStatus) => {
    const cleanHighlights = highlights.map((h) => h.trim()).filter(Boolean);
    const cleanSpeakers = speakers.map(({ uploading, ...rest }) => ({
      name:        rest.name ? rest.name.trim() : "",
      designation: rest.designation ? rest.designation.trim() : "",
      role:        rest.designation ? rest.designation.trim() : "",
      company:     rest.company ? rest.company.trim() : "",
      organization:rest.company ? rest.company.trim() : "",
      bio:         rest.bio ? rest.bio.trim() : "",
      linkedin:    rest.linkedin ? rest.linkedin.trim() : "",
      image:       rest.image || "",
    })).filter((spk) => spk.name || spk.image);

    return {
      title:       title.trim(),
      slug:        derivedSlug || generateSlug(title),
      subtitle:    category,
      category:    category,
      tagline:     tagline.trim(),
      description: shortDesc.trim() || longDesc.trim(),
      shortDescription: shortDesc.trim(),
      longDescription:  longDesc.trim(),
      venue:       venue.trim(),
      location:    location.trim(),
      organizer:   organizer.trim(),
      eventStartDate,
      eventEndDate,
      registrationDeadline: regDeadline,
      maxRegistrations: maxRegistrations ? Number(maxRegistrations) : null,
      image:       bannerUrl,
      banner:      bannerUrl,
      thumbnail:   thumbUrl,
      participants:      stats.participants.trim(),
      participantsLabel: stats.participantsLabel.trim(),
      events:            stats.events.trim(),
      eventsLabel:       stats.eventsLabel.trim(),
      editions:          stats.editions.trim(),
      editionsLabel:     stats.editionsLabel.trim(),
      years:             stats.years.trim(),
      yearsLabel:        stats.yearsLabel.trim(),
      competitions:      stats.competitions.trim(),
      competitionsLabel: stats.competitionsLabel.trim(),
      highlights:  cleanHighlights,
      speakers:    cleanSpeakers,
      badgeText:   badgeText.trim(),
      icon:        badgeIcon,
      ctaText:     ctaText.trim(),
      ctaLink:     ctaLink.trim(),
      status:      submitStatus,
      featured:    featured,
      // Pricing / Registration Type
      isPaid:      isPaid,
      feeAmount:   isPaid ? (Number.isFinite(Number(feeAmount)) ? Number(feeAmount) : 0) : 0,
      currency:    "INR",
    };
  }, [
    title, derivedSlug, category, tagline, shortDesc, longDesc,
    venue, location, organizer, eventStartDate, eventEndDate, regDeadline,
    maxRegistrations, isPaid, feeAmount,
    bannerUrl, thumbUrl, stats, highlights, speakers,
    badgeText, badgeIcon, ctaText, ctaLink, featured,
  ]);

  /* ── Submit handler ── */
  const handleSubmit = (submitStatus) => {
    if (!validate()) {
      // Scroll to first error
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    onSubmit(buildPayload(submitStatus));
  };

  /* ── RENDER ── */
  return (
    <div className="add-event-page">

      {/* Page Header */}
      <div className="add-event-header">
        <div className="add-event-header-left">
          <h1>{pageTitle}</h1>
          <p>{pageSubtitle}</p>
        </div>
        <div className="add-event-header-actions">
          <Link
            to="/admin/events"
            className="ae-submit-btn cancel"
            style={{ textDecoration: "none", padding: "10px 18px" }}
          >
            <FaArrowLeft />
            <span>Back to Events</span>
          </Link>
        </div>
      </div>

      {/* Layout */}
      <div className="add-event-layout">

        {/* ══════ LEFT — Main ══════ */}
        <div className="add-event-main">

          {/* ── 1. Basic Information ── */}
          <div className="ae-card">
            <h2 className="ae-card-title">
              <span className="ae-card-icon">📋</span>
              Basic Information
            </h2>

            {/* Title */}
            <div className="ae-field" style={{ marginBottom: 18 }}>
              <label className="ae-label" htmlFor="evt-title">
                Event Title <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                id="evt-title"
                type="text"
                className={`ae-input title-xl${errors.title ? " error" : ""}`}
                placeholder="e.g. TechBloom 2026"
                value={title}
                onChange={(e) => { handleTitleChange(e.target.value); setErrors((p) => ({ ...p, title: "" })); }}
                style={errors.title ? { borderColor: "#ef4444", boxShadow: "0 0 0 3px rgba(239,68,68,.12)" } : {}}
              />
              {errors.title && <span style={{ color: "#ef4444", fontSize: 12, marginTop: 2 }}>{errors.title}</span>}
            </div>

            {/* Slug */}
            <div className="ae-field" style={{ marginBottom: 18 }}>
              <label className="ae-label" htmlFor="evt-slug">
                URL Slug{" "}
                <span
                  style={{ marginLeft: 8, fontSize: 11, color: "#2563eb", cursor: "pointer", fontWeight: 600 }}
                  onClick={() => setSlugLocked((v) => !v)}
                >
                  {slugLocked ? "🔒 Locked — click to auto-generate" : "🔓 Auto — click to lock"}
                </span>
              </label>
              <div className="ae-slug-row">
                <span className="ae-slug-prefix">/events/</span>
                <input
                  id="evt-slug"
                  type="text"
                  className="ae-input ae-slug-input"
                  value={derivedSlug}
                  onChange={(e) => { setSlugLocked(true); setSlugManual(e.target.value); setErrors((p) => ({ ...p, slug: "" })); }}
                  placeholder="event-slug"
                  style={errors.slug ? { borderColor: "#ef4444" } : {}}
                />
              </div>
              {errors.slug && <span style={{ color: "#ef4444", fontSize: 12, marginTop: 2 }}>{errors.slug}</span>}
            </div>

            <div className="ae-form-grid-2">
              {/* Category */}
              <div className="ae-field">
                <label className="ae-label" htmlFor="evt-cat">Category</label>
                <select
                  id="evt-cat"
                  className="ae-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Organizer */}
              <div className="ae-field">
                <label className="ae-label" htmlFor="evt-org">Organizer</label>
                <input
                  id="evt-org"
                  type="text"
                  className="ae-input"
                  value={organizer}
                  onChange={(e) => setOrganizer(e.target.value)}
                  placeholder="Abhyudaya Club"
                />
              </div>

              {/* Tagline */}
              <div className="ae-field ae-field-full">
                <label className="ae-label" htmlFor="evt-tagline">Tagline</label>
                <input
                  id="evt-tagline"
                  type="text"
                  className="ae-input"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Innovate • Build • Compete"
                />
              </div>

              {/* Venue */}
              <div className="ae-field">
                <label className="ae-label" htmlFor="evt-venue">Venue</label>
                <input
                  id="evt-venue"
                  type="text"
                  className="ae-input"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="Main Auditorium"
                />
              </div>

              {/* Location */}
              <div className="ae-field">
                <label className="ae-label" htmlFor="evt-location">Location / City</label>
                <input
                  id="evt-location"
                  type="text"
                  className="ae-input"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Kanpur, UP"
                />
              </div>

              {/* Start Date */}
              <div className="ae-field">
                <label className="ae-label" htmlFor="evt-start">Event Start Date</label>
                <input
                  id="evt-start"
                  type="date"
                  className="ae-input"
                  value={eventStartDate}
                  onChange={(e) => setEventStartDate(e.target.value)}
                />
              </div>

              {/* End Date */}
              <div className="ae-field">
                <label className="ae-label" htmlFor="evt-end">Event End Date</label>
                <input
                  id="evt-end"
                  type="date"
                  className="ae-input"
                  value={eventEndDate}
                  onChange={(e) => setEventEndDate(e.target.value)}
                />
              </div>

              {/* Registration Deadline */}
              <div className="ae-field ae-field-full">
                <label className="ae-label" htmlFor="evt-reg">Registration Deadline</label>
                <input
                  id="evt-reg"
                  type="date"
                  className="ae-input"
                  value={regDeadline}
                  onChange={(e) => setRegDeadline(e.target.value)}
                />
              </div>

              {/* Max Registrations */}
              <div className="ae-field ae-field-full">
                <label className="ae-label" htmlFor="evt-max-reg">
                  Max Registrations <span style={{ fontSize: 11, color: "#64748b", fontWeight: 400 }}>(leave empty for unlimited)</span>
                </label>
                <input
                  id="evt-max-reg"
                  type="number"
                  min="1"
                  className="ae-input"
                  value={maxRegistrations}
                  onChange={(e) => setMaxRegistrations(e.target.value)}
                  placeholder="e.g. 500"
                />
              </div>
            </div>

            {/* Short Description */}
            <div className="ae-field" style={{ marginTop: 16 }}>
              <label className="ae-label" htmlFor="evt-short">
                Short Description <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <textarea
                id="evt-short"
                className="ae-textarea"
                placeholder="One-line summary shown on the Events listing page…"
                value={shortDesc}
                onChange={(e) => { setShortDesc(e.target.value); setErrors((p) => ({ ...p, description: "" })); }}
                rows={3}
                style={errors.description ? { borderColor: "#ef4444" } : {}}
              />
              {errors.description && <span style={{ color: "#ef4444", fontSize: 12 }}>{errors.description}</span>}
            </div>

            {/* Full Description */}
            <div className="ae-field" style={{ marginTop: 14 }}>
              <label className="ae-label" htmlFor="evt-long">Full Description</label>
              <textarea
                id="evt-long"
                className="ae-textarea tall"
                placeholder="Detailed description of the event…"
                value={longDesc}
                onChange={(e) => setLongDesc(e.target.value)}
                rows={6}
              />
            </div>
          </div>

          {/* ── 1b. Registration / Pricing ── */}
          <div className="ae-card">
            <h2 className="ae-card-title">
              <span className="ae-card-icon">💳</span>
              Registration & Pricing
            </h2>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 18 }}>
              Choose whether this event is free or requires a registration fee.
            </p>

            {/* Registration Type */}
            <div className="ae-field">
              <span className="ae-label">Registration Type</span>
              <div className="ae-status-pills">
                <button
                  type="button"
                  className={`ae-status-pill-btn ${!isPaid ? "active-draft" : ""}`}
                  onClick={() => { setIsPaid(false); setFeeAmount(""); setErrors((p) => ({ ...p, fee: "" })); }}
                >
                  🆓 Free Event
                </button>
                <button
                  type="button"
                  className={`ae-status-pill-btn ${isPaid ? "active-published" : ""}`}
                  onClick={() => { setIsPaid(true); setErrors((p) => ({ ...p, fee: "" })); }}
                >
                  💰 Paid Event
                </button>
              </div>
            </div>

            {/* Fee input — only shown for paid events */}
            {isPaid && (
              <div className="ae-field" style={{ marginTop: 16 }}>
                <label className="ae-label" htmlFor="evt-fee">
                  Registration Fee <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div className="ae-slug-row">
                  <span className="ae-slug-prefix">₹</span>
                  <input
                    id="evt-fee"
                    type="number"
                    min="0"
                    step="0.01"
                    className={`ae-input ae-slug-input${errors.fee ? " error" : ""}`}
                    placeholder="e.g. 199"
                    value={feeAmount}
                    onChange={(e) => { setFeeAmount(e.target.value); setErrors((p) => ({ ...p, fee: "" })); }}
                    style={errors.fee ? { borderColor: "#ef4444", boxShadow: "0 0 0 3px rgba(239,68,68,.12)" } : {}}
                  />
                </div>
                {errors.fee && <span style={{ color: "#ef4444", fontSize: 12, marginTop: 2 }}>{errors.fee}</span>}
                <small style={{ color: "#64748b", fontSize: 12, display: "block", marginTop: 4 }}>
                  Fee is in INR. Free events will automatically save a fee of ₹0.
                </small>
              </div>
            )}
          </div>

          {/* ── 2. Hero Images ── */}
          <div className="ae-card">
            <h2 className="ae-card-title">
              <span className="ae-card-icon">🖼️</span>
              Hero Images
            </h2>

            <div className="ae-form-grid-2">
              <ImageUploadField
                label="Hero Banner (wide, 16:9)"
                value={bannerUrl}
                uploading={uploadingBanner}
                onFileChange={(e) =>
                  handleImageUpload(e.target.files[0], setBannerUrl, setUploadingBanner)
                }
                onRemove={() => setBannerUrl("")}
              />
              <ImageUploadField
                label="Thumbnail / Square Poster"
                value={thumbUrl}
                uploading={uploadingThumb}
                onFileChange={(e) =>
                  handleImageUpload(e.target.files[0], setThumbUrl, setUploadingThumb)
                }
                onRemove={() => setThumbUrl("")}
              />
            </div>
          </div>

          {/* ── 3. Statistics ── */}
          <div className="ae-card">
            <h2 className="ae-card-title">
              <span className="ae-card-icon">📊</span>
              Statistics
            </h2>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 18 }}>
              Fill in the metric values (e.g. "2000+") and customise the label below each.
            </p>

            <div className="ae-stats-grid">
              {[
                { key: "participants",  labelKey: "participantsLabel",  defaultLabel: "Participants" },
                { key: "events",        labelKey: "eventsLabel",        defaultLabel: "Activities" },
                { key: "competitions",  labelKey: "competitionsLabel",  defaultLabel: "Competitions" },
                { key: "editions",      labelKey: "editionsLabel",      defaultLabel: "Editions" },
                { key: "years",         labelKey: "yearsLabel",         defaultLabel: "Years Active" },
              ].map(({ key, labelKey, defaultLabel }) => (
                <div className="ae-stat-item" key={key}>
                  <input
                    className="ae-stat-input"
                    type="text"
                    placeholder="—"
                    value={stats[key]}
                    onChange={(e) => updateStat(key, e.target.value)}
                    aria-label={`${defaultLabel} value`}
                  />
                  <input
                    className="ae-input"
                    style={{ fontSize: 11, padding: "4px 8px", marginTop: 6, borderRadius: 6 }}
                    type="text"
                    placeholder={defaultLabel}
                    value={stats[labelKey]}
                    onChange={(e) => updateStat(labelKey, e.target.value)}
                    aria-label={`${defaultLabel} label`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── 4. Highlights ── */}
          <div className="ae-card">
            <h2 className="ae-card-title">
              <span className="ae-card-icon">✨</span>
              Key Highlights
            </h2>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
              Activities, sub-events, or features displayed as bullet points on the event card.
            </p>

            <div className="ae-highlights-list">
              {highlights.map((h, i) => (
                <div className="ae-highlight-item" key={i}>
                  <input
                    type="text"
                    className="ae-input"
                    placeholder={`Highlight ${i + 1} — e.g. Hackathon`}
                    value={h}
                    onChange={(e) => updateHighlight(i, e.target.value)}
                  />
                  <button
                    type="button"
                    className="ae-remove-highlight-btn"
                    onClick={() => removeHighlight(i)}
                    aria-label="Remove highlight"
                  >
                    <FaTimes />
                  </button>
                </div>
              ))}
            </div>

            <button type="button" className="ae-add-highlight-btn" onClick={addHighlight}>
              <FaPlus /> Add Highlight
            </button>
          </div>

          {/* ── 5. Theme / Badge / CTA ── */}
          <div className="ae-card">
            <h2 className="ae-card-title">
              <span className="ae-card-icon">🎨</span>
              Theme &amp; Display
            </h2>

            <div className="ae-form-grid-2">
              {/* Badge Icon */}
              <div className="ae-field" ref={emojiRef} style={{ position: "relative" }}>
                <label className="ae-label">Badge Icon (Emoji)</label>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((v) => !v)}
                  style={{
                    width: "100%", padding: "10px 14px",
                    border: "1px solid #cbd5e1", borderRadius: 10,
                    background: "#fff", fontSize: 22, cursor: "pointer",
                    textAlign: "left", display: "flex", alignItems: "center",
                    gap: 10, fontFamily: "inherit",
                  }}
                >
                  <span>{badgeIcon}</span>
                  <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>Click to change</span>
                </button>

                {showEmojiPicker && (
                  <div style={{
                    position: "absolute", top: "110%", left: 0, zIndex: 100,
                    background: "#fff", border: "1px solid #e2e8f0",
                    borderRadius: 12, padding: 12,
                    display: "flex", flexWrap: "wrap", gap: 6,
                    boxShadow: "0 8px 30px rgba(0,0,0,0.12)", width: 240,
                  }}>
                    {EMOJI_OPTIONS.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => { setBadgeIcon(em); setShowEmojiPicker(false); }}
                        style={{
                          fontSize: 24,
                          background: badgeIcon === em ? "#eff6ff" : "transparent",
                          border: badgeIcon === em ? "1px solid #2563eb" : "1px solid transparent",
                          borderRadius: 8, padding: 6, cursor: "pointer",
                        }}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Badge Text */}
              <div className="ae-field">
                <label className="ae-label" htmlFor="evt-badge-text">Badge Text</label>
                <input
                  id="evt-badge-text"
                  type="text"
                  className="ae-input"
                  placeholder="e.g. Space & Innovation"
                  value={badgeText}
                  onChange={(e) => setBadgeText(e.target.value)}
                />
              </div>

              {/* CTA Text */}
              <div className="ae-field">
                <label className="ae-label" htmlFor="evt-cta-text">CTA Button Text</label>
                <input
                  id="evt-cta-text"
                  type="text"
                  className="ae-input"
                  placeholder="Learn More"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                />
              </div>

              {/* CTA Link */}
              <div className="ae-field">
                <label className="ae-label" htmlFor="evt-cta-link">CTA Link / URL</label>
                <input
                  id="evt-cta-link"
                  type="text"
                  className="ae-input"
                  placeholder="/events/techbloom"
                  value={ctaLink}
                  onChange={(e) => setCtaLink(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ── 6. Speakers & Mentors Management ── */}
          <div className="ae-card">
            <h2 className="ae-card-title">
              <span className="ae-card-icon">🎤</span>
              Speakers &amp; Mentors
            </h2>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 18 }}>
              Add event speakers, keynote presenters, or mentors. You can add an unlimited number of speakers.
            </p>

            <div className="ae-speakers-list">
              {speakers.map((spk, idx) => (
                <div key={spk.id || idx} className="ae-speaker-item-card">
                  <div className="ae-speaker-header">
                    <h4>Speaker #{idx + 1}</h4>
                    <button
                      type="button"
                      className="ae-remove-highlight-btn"
                      onClick={() => removeSpeaker(idx)}
                      aria-label="Remove speaker"
                      title="Remove Speaker"
                    >
                      <FaTimes />
                    </button>
                  </div>

                  <div className="ae-speaker-photo-box">
                    {spk.image ? (
                      <img src={spk.image} alt={spk.name || "Speaker"} className="ae-speaker-photo-preview" />
                    ) : (
                      <div className="ae-speaker-photo-placeholder">👤</div>
                    )}
                    <div style={{ flex: 1 }}>
                      <label className="ae-img-action-btn replace" style={{ display: "inline-flex", cursor: "pointer" }}>
                        <FaCloudUploadAlt />
                        <span>{spk.uploading ? "Uploading..." : spk.image ? "Change Photo" : "Upload Photo"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleSpeakerPhotoUpload(idx, e.target.files[0])}
                          disabled={spk.uploading}
                        />
                      </label>
                      {spk.image && (
                        <button
                          type="button"
                          className="ae-img-action-btn remove"
                          onClick={() => updateSpeaker(idx, "image", "")}
                          style={{ marginLeft: 8 }}
                        >
                          Remove Photo
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="ae-form-grid-2">
                    {/* Name */}
                    <div className="ae-field">
                      <label className="ae-label">Full Name *</label>
                      <input
                        type="text"
                        className="ae-input"
                        placeholder="e.g. Dr. A. P. Sharma"
                        value={spk.name}
                        onChange={(e) => updateSpeaker(idx, "name", e.target.value)}
                      />
                    </div>

                    {/* Designation */}
                    <div className="ae-field">
                      <label className="ae-label">Designation / Role</label>
                      <input
                        type="text"
                        className="ae-input"
                        placeholder="e.g. Keynote Speaker / Chief Guest"
                        value={spk.designation}
                        onChange={(e) => updateSpeaker(idx, "designation", e.target.value)}
                      />
                    </div>

                    {/* Company */}
                    <div className="ae-field">
                      <label className="ae-label">Company / Organization</label>
                      <input
                        type="text"
                        className="ae-input"
                        placeholder="e.g. ISRO / Google DeepMind"
                        value={spk.company}
                        onChange={(e) => updateSpeaker(idx, "company", e.target.value)}
                      />
                    </div>

                    {/* LinkedIn */}
                    <div className="ae-field">
                      <label className="ae-label">LinkedIn Profile URL</label>
                      <input
                        type="text"
                        className="ae-input"
                        placeholder="https://linkedin.com/in/username"
                        value={spk.linkedin}
                        onChange={(e) => updateSpeaker(idx, "linkedin", e.target.value)}
                      />
                    </div>

                    {/* Bio */}
                    <div className="ae-field ae-field-full">
                      <label className="ae-label">Short Bio</label>
                      <textarea
                        className="ae-textarea"
                        rows={2}
                        placeholder="Brief background summary of the speaker…"
                        value={spk.bio}
                        onChange={(e) => updateSpeaker(idx, "bio", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button type="button" className="ae-add-highlight-btn" onClick={addSpeaker}>
              <FaPlus /> Add Speaker
            </button>
          </div>

        </div>
        {/* end main */}

        {/* ══════ RIGHT — Sidebar ══════ */}
        <div className="add-event-sidebar">

          {/* Publish / Submit card */}
          <div className="ae-sidebar-submit-card">
            <h3 style={{
              fontSize: 14.5, fontWeight: 700, color: "#0f172a",
              marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid #f1f5f9",
            }}>
              Publish Options
            </h3>

            {/* Status */}
            <div className="ae-field">
              <span className="ae-label">Status</span>
              <div className="ae-status-pills">
                <button
                  type="button"
                  className={`ae-status-pill-btn ${status === "Draft" ? "active-draft" : ""}`}
                  onClick={() => setStatus("Draft")}
                >📝 Draft</button>
                <button
                  type="button"
                  className={`ae-status-pill-btn ${status === "Published" ? "active-published" : ""}`}
                  onClick={() => setStatus("Published")}
                >🟢 Publish</button>
              </div>
            </div>

            {/* Featured toggle */}
            <div className="ae-field" style={{ marginTop: 8 }}>
              <span className="ae-label">Featured</span>
              <div
                className="ae-featured-toggle"
                onClick={() => setFeatured((v) => !v)}
                role="switch"
                aria-checked={featured}
                tabIndex={0}
                onKeyDown={(e) => e.key === " " && setFeatured((v) => !v)}
              >
                <span>⭐ Mark as Featured</span>
                <div className={`ae-toggle-track ${featured ? "on" : ""}`}>
                  <div className="ae-toggle-thumb" />
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
              <button
                type="button"
                className="ae-submit-btn primary"
                disabled={saving || uploadingBanner || uploadingThumb}
                onClick={() => handleSubmit("Published")}
              >
                {saving
                  ? <><FaSpinner className="ae-spin" /> Saving…</>
                  : <><FaPaperPlane /> {isEdit ? "Update & Publish" : "Publish Event"}</>}
              </button>

              <button
                type="button"
                className="ae-submit-btn secondary"
                disabled={saving || uploadingBanner || uploadingThumb}
                onClick={() => handleSubmit("Draft")}
              >
                {saving
                  ? <><FaSpinner className="ae-spin" /> Saving…</>
                  : <><FaSave /> {isEdit ? "Update Draft" : "Save as Draft"}</>}
              </button>

              <Link
                to="/admin/events"
                className="ae-submit-btn cancel"
                style={{ textDecoration: "none" }}
              >
                Cancel
              </Link>
            </div>
          </div>

          {/* Quick Preview */}
          <div className="ae-sidebar-card">
            <h3>Quick Preview</h3>

            {bannerUrl ? (
              <img
                src={bannerUrl}
                alt="Banner preview"
                style={{ width: "100%", borderRadius: 10, objectFit: "cover", maxHeight: 140, marginBottom: 10 }}
              />
            ) : (
              <div style={{
                background: "#f1f5f9", borderRadius: 10, height: 100,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#94a3b8", fontSize: 13, marginBottom: 10,
              }}>
                No banner yet
              </div>
            )}

            <p style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 4 }}>
              {title || "Event Title"}
            </p>
            <p style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>
              {tagline || "Tagline will appear here"}
            </p>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              background: "#eff6ff", color: "#2563eb",
              padding: "4px 10px", borderRadius: 999,
              fontSize: 12, fontWeight: 600,
            }}>
              {badgeIcon} {badgeText || category}
            </span>
          </div>

          {/* Event Info Summary */}
          <div className="ae-sidebar-card">
            <h3>Event Info</h3>
            {[
              { label: "Venue",          value: venue || "—" },
              { label: "Location",       value: location || "—" },
              { label: "Starts",         value: eventStartDate || "—" },
              { label: "Ends",           value: eventEndDate || "—" },
              { label: "Reg. Deadline",  value: regDeadline || "—" },
            ].map(({ label, value }) => (
              <div key={label} style={{
                display: "flex", justifyContent: "space-between",
                fontSize: 13, padding: "6px 0", borderBottom: "1px solid #f1f5f9",
              }}>
                <span style={{ color: "#64748b", fontWeight: 600 }}>{label}</span>
                <span style={{ color: "#0f172a", fontWeight: 500, textAlign: "right", maxWidth: "55%" }}>{value}</span>
              </div>
            ))}
          </div>

        </div>
        {/* end sidebar */}

      </div>
      {/* end layout */}

    </div>
  );
}
