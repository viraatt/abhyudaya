import { useState } from "react";
import StarRating from "./StarRating";
import { useToast } from "../../Admin/components/Toast";
import { submitReview } from "../../Firebase/reviewService";

const INITIAL_FORM = {
  name: "",
  email: "",
  college: "",
  branch: "",
  rating: 0,
  title: "",
  message: "",
};

export default function ReviewForm({ event }) {
  const toast = useToast();
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = "Name is required.";
    }

    if (!form.rating || form.rating < 1) {
      nextErrors.rating = "Please select a rating.";
    }

    if (!form.title.trim()) {
      nextErrors.title = "Review title is required.";
    }

    if (!form.message.trim()) {
      nextErrors.message = "Review message is required.";
    } else if (form.message.trim().length < 10) {
      nextErrors.message = "Review message must be at least 10 characters.";
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = "Please enter a valid email address.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      await submitReview({
        eventId: event.id || event.slug,
        eventTitle: event.title,
        eventSlug: event.slug,
        name: form.name,
        email: form.email,
        college: form.college,
        branch: form.branch,
        rating: form.rating,
        title: form.title,
        message: form.message,
      });

      toast.success("Thank you! Your review has been submitted and is pending approval.");
      setForm(INITIAL_FORM);
    } catch (err) {
      console.error("Failed to submit review:", err);
      toast.error("Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="review-form" onSubmit={handleSubmit} noValidate>
      <h3 className="review-form__title">Share Your Experience</h3>
      <p className="review-form__subtitle">
        Attended {event.title}? We&apos;d love to hear your feedback.
      </p>

      <div className="review-form__grid">
        <div className="review-form__field">
          <label htmlFor="review-name">
            Name <span className="review-form__required">*</span>
          </label>
          <input
            id="review-name"
            type="text"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="Your full name"
            disabled={submitting}
          />
          {errors.name && <span className="review-form__error">{errors.name}</span>}
        </div>

        <div className="review-form__field">
          <label htmlFor="review-email">Email</label>
          <input
            id="review-email"
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            placeholder="you@example.com"
            disabled={submitting}
          />
          {errors.email && <span className="review-form__error">{errors.email}</span>}
        </div>

        <div className="review-form__field">
          <label htmlFor="review-college">College</label>
          <input
            id="review-college"
            type="text"
            value={form.college}
            onChange={(e) => updateField("college", e.target.value)}
            placeholder="Your college"
            disabled={submitting}
          />
        </div>

        <div className="review-form__field">
          <label htmlFor="review-branch">Branch</label>
          <input
            id="review-branch"
            type="text"
            value={form.branch}
            onChange={(e) => updateField("branch", e.target.value)}
            placeholder="e.g. CSE, ECE"
            disabled={submitting}
          />
        </div>
      </div>

      <div className="review-form__field review-form__field--full">
        <label>
          Rating <span className="review-form__required">*</span>
        </label>
        <StarRating
          value={form.rating}
          onChange={(value) => updateField("rating", value)}
          size="lg"
        />
        {errors.rating && <span className="review-form__error">{errors.rating}</span>}
      </div>

      <div className="review-form__field review-form__field--full">
        <label htmlFor="review-title">
          Review Title <span className="review-form__required">*</span>
        </label>
        <input
          id="review-title"
          type="text"
          value={form.title}
          onChange={(e) => updateField("title", e.target.value)}
          placeholder="Summarize your experience"
          disabled={submitting}
        />
        {errors.title && <span className="review-form__error">{errors.title}</span>}
      </div>

      <div className="review-form__field review-form__field--full">
        <label htmlFor="review-message">
          Review Message <span className="review-form__required">*</span>
        </label>
        <textarea
          id="review-message"
          rows={5}
          value={form.message}
          onChange={(e) => updateField("message", e.target.value)}
          placeholder="Tell us about your experience at this event..."
          disabled={submitting}
        />
        {errors.message && <span className="review-form__error">{errors.message}</span>}
      </div>

      <button type="submit" className="review-form__submit" disabled={submitting}>
        {submitting ? "Submitting..." : "Submit Review"}
      </button>
    </form>
  );
}
