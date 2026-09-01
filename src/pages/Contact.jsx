import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { club, socials } from "../data/club.js";
import PageHero from "../components/PageHero.jsx";
import BreadcrumbSchema from "../components/seo/schemas/BreadcrumbSchema.jsx";
import "./Contact.css";
import { submitContactMessage } from "../Firebase/contactService.js";

const SITE_URL = "https://www.abhyudayaclub.in";

function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const items = el.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    items.forEach((item) => io.observe(item));
    return () => io.disconnect();
  }, []);
  return ref;
}

const INITIAL_FORM = {
  name: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
};

export default function Contact() {
  const gridRef = useReveal();
  const faqRef = useReveal();

  const [formState, setFormState] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedStatus, setSubmittedStatus] = useState(null);

  const breadcrumbItems = [
    { name: "Home", url: SITE_URL },
    { name: "Contact", url: `${SITE_URL}/contact` },
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How can I contact the club?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Email us anytime at abhyudayaclubmpec@gmail.com or reach out through our Instagram or LinkedIn pages.",
        },
      },
      {
        "@type": "Question",
        name: "Can I collaborate with Abhyudaya Club?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. We welcome collaborations, sponsorships, guest lectures and workshops.",
        },
      },
      {
        "@type": "Question",
        name: "Where are your events conducted?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Most events are organized at Maharana Pratap Engineering College, Kanpur.",
        },
      },
      {
        "@type": "Question",
        name: "How quickly do you reply?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "We usually respond within 24–48 hours.",
        },
      },
    ],
  };

  const validate = () => {
    const newErrors = {};
    const nameTrim = formState.name.trim();
    const emailTrim = formState.email.trim();
    const messageTrim = formState.message.trim();

    if (!nameTrim) {
      newErrors.name = "Full name is required.";
    } else if (nameTrim.length < 2) {
      newErrors.name = "Name must be at least 2 characters.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailTrim) {
      newErrors.email = "Email address is required.";
    } else if (!emailRegex.test(emailTrim)) {
      newErrors.email = "Please enter a valid email address (e.g. name@domain.com).";
    }

    if (formState.phone.trim()) {
      const phoneClean = formState.phone.replace(/[\s\-()]/g, "");
      if (phoneClean.length < 7 || phoneClean.length > 15) {
        newErrors.phone = "Please enter a valid phone number (7-15 digits).";
      }
    }

    if (!messageTrim) {
      newErrors.message = "Please write a message.";
    } else if (messageTrim.length < 5) {
      newErrors.message = "Message must be at least 5 characters.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    // Prevent duplicate submissions while in progress
    if (submitting) return;

    if (!validate()) {
      return;
    }

    setSubmitting(true);
    setSubmittedStatus(null);

    try {
      await submitContactMessage(formState);
      setSubmittedStatus({
        success: true,
        message: "Thank you! Your message has been sent successfully. Our team will get back to you soon.",
      });
      setFormState(INITIAL_FORM);
      setErrors({});
    } catch (err) {
      console.error("Error submitting contact message:", err);
      setSubmittedStatus({
        success: false,
        message: err.message || "Unable to send message at the moment. Please try again or email us directly.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const mapQuery = encodeURIComponent(`${club.institute}, ${club.department}`);

  return (
    <>
      <Helmet>
        <title>Contact Us | Abhyudaya Club — Get in Touch, MPEC Kanpur</title>
        <meta
          name="description"
          content="Contact Abhyudaya Club at MPEC Kanpur. Reach out for collaborations, sponsorships, queries, or to learn more about joining the club."
        />
        <link rel="canonical" href={`${SITE_URL}/contact`} />
        <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1" />

        <meta property="og:type" content="website" />
        <meta property="og:title" content="Contact Abhyudaya Club | MPEC Kanpur" />
        <meta
          property="og:description"
          content="Get in touch with Abhyudaya Club for collaborations, sponsorships, or queries."
        />
        <meta property="og:url" content={`${SITE_URL}/contact`} />
        <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
        <meta property="og:locale" content="en_IN" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Contact Abhyudaya Club | MPEC Kanpur" />
        <meta
          name="twitter:description"
          content="Get in touch with Abhyudaya Club for collaborations, sponsorships, or queries."
        />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.png`} />

        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <BreadcrumbSchema items={breadcrumbItems} />

      <PageHero
        eyebrow="Get in Touch"
        title="Let's Connect."
        lede="Have a question, collaboration idea, or want to know more about Abhyudaya Club? We'd love to hear from you."
      />

      <section className="section">
        <div className="wrap contact-grid" ref={gridRef}>
          {/* Contact Information */}
          <div className="contact-info">
            <div className="contact-info__block reveal">
              <p className="eyebrow">📍 Address</p>
              <p className="contact-info__text">{club.institute}</p>
              <p className="contact-info__text">{club.department}</p>
            </div>

            {/* Map */}
            <div className="contact-info__block contact-map reveal">
              <iframe
                title="Club location map"
                className="contact-map__frame"
                src={`https://maps.google.com/maps?q=${mapQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            <div className="contact-info__block reveal">
              <p className="eyebrow">📧 Email</p>
              <a
                href={`mailto:${socials.email}`}
                className="contact-info__text contact-info__email"
              >
                {socials.email}
              </a>
            </div>

            <div className="contact-info__block reveal">
              <p className="eyebrow">🌐 Follow Us</p>
              <div className="contact-info__socials">
                <a
                  href={socials.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-pill"
                >
                  Instagram
                </a>
                <a
                  href={socials.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-pill"
                >
                  LinkedIn
                </a>
                {socials.twitter && (
                  <a
                    href={socials.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-pill"
                  >
                    Twitter / X
                  </a>
                )}
                {socials.whatsapp && (
                  <a
                    href={socials.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-pill"
                  >
                    WhatsApp
                  </a>
                )}
                {socials.youtube && (
                  <a
                    href={socials.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-pill"
                  >
                    YouTube
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Contact Inquiry Form */}
          <div className="join-card reveal">
            <span className="join-badge">📩 Send Us a Message</span>
            <h2>Get in Touch Directly</h2>
            <p className="contact-card-sub">
              Fill out the form below and we will respond as soon as possible.
            </p>

            {submittedStatus && (
              <div
                className={`contact-alert ${
                  submittedStatus.success ? "contact-alert--success" : "contact-alert--error"
                }`}
                role="alert"
              >
                <div className="contact-alert__icon">
                  {submittedStatus.success ? "✓" : "⚠"}
                </div>
                <div className="contact-alert__content">
                  <strong className="contact-alert__title">
                    {submittedStatus.success ? "Message Sent!" : "Submission Error"}
                  </strong>
                  <p>{submittedStatus.message}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="contact-form" noValidate>
              <div className="form-group">
                <label htmlFor="contact-name" className="form-label">
                  Full Name <span className="req">*</span>
                </label>
                <input
                  id="contact-name"
                  type="text"
                  name="name"
                  value={formState.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Rahul Sharma"
                  className={`contact-input ${errors.name ? "has-error" : ""}`}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? "name-error" : undefined}
                  disabled={submitting}
                  required
                />
                {errors.name && (
                  <span id="name-error" className="field-error">
                    {errors.name}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="contact-email" className="form-label">
                  Email Address <span className="req">*</span>
                </label>
                <input
                  id="contact-email"
                  type="email"
                  name="email"
                  value={formState.email}
                  onChange={handleInputChange}
                  placeholder="e.g. rahul@example.com"
                  className={`contact-input ${errors.email ? "has-error" : ""}`}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  disabled={submitting}
                  required
                />
                {errors.email && (
                  <span id="email-error" className="field-error">
                    {errors.email}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="contact-phone" className="form-label">
                  Phone Number <span className="opt">(Optional)</span>
                </label>
                <input
                  id="contact-phone"
                  type="tel"
                  name="phone"
                  value={formState.phone}
                  onChange={handleInputChange}
                  placeholder="e.g. +91 98765 43210"
                  className={`contact-input ${errors.phone ? "has-error" : ""}`}
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? "phone-error" : undefined}
                  disabled={submitting}
                />
                {errors.phone && (
                  <span id="phone-error" className="field-error">
                    {errors.phone}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="contact-subject" className="form-label">
                  Subject / Topic <span className="opt">(Optional)</span>
                </label>
                <input
                  id="contact-subject"
                  type="text"
                  name="subject"
                  value={formState.subject}
                  onChange={handleInputChange}
                  placeholder="e.g. Event Collaboration, Club Query..."
                  className="contact-input"
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="contact-message" className="form-label">
                  Message <span className="req">*</span>
                </label>
                <textarea
                  id="contact-message"
                  rows="4"
                  name="message"
                  value={formState.message}
                  onChange={handleInputChange}
                  placeholder="Write your detailed query or proposal here..."
                  className={`contact-input contact-textarea ${errors.message ? "has-error" : ""}`}
                  aria-invalid={Boolean(errors.message)}
                  aria-describedby={errors.message ? "message-error" : undefined}
                  disabled={submitting}
                  required
                />
                {errors.message && (
                  <span id="message-error" className="field-error">
                    {errors.message}
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="btn btn--solid register-btn contact-submit-btn"
                disabled={submitting}
                aria-busy={submitting}
              >
                {submitting ? (
                  <span className="btn-loading-content">
                    <span className="btn-spinner" aria-hidden="true" />
                    Sending Message...
                  </span>
                ) : (
                  "Submit Message →"
                )}
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="faq-card" ref={faqRef}>
            <h2>Frequently Asked Questions</h2>
            <div className="faq-item reveal">
              <h3>How can I contact the club?</h3>
              <p>Email us anytime or reach out through our Instagram or LinkedIn pages.</p>
            </div>
            <div className="faq-item reveal">
              <h3>Can I collaborate with Abhyudaya Club?</h3>
              <p>Yes. We welcome collaborations, sponsorships, guest lectures and workshops.</p>
            </div>
            <div className="faq-item reveal">
              <h3>Where are your events conducted?</h3>
              <p>Most events are organized at Maharana Pratap Engineering College, Kanpur.</p>
            </div>
            <div className="faq-item reveal">
              <h3>How quickly do you reply?</h3>
              <p>We usually respond within 24–48 hours.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
