import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { club, socials } from "../data/club.js";
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

const ISSUE_OPTIONS = [
  {
    id: "bug",
    label: "Code Bug",
    subtitle: "Something's broken on the website.",
    reaction: "Have you tried Googling the error, restarting VS Code, and blaming the compiler?",
    subjectPreload: "Code Bug",
  },
  {
    id: "event",
    label: "Event Idea",
    subtitle: "I've got an idea. Hear me out.",
    reaction: "How many volunteers, extension boards, and last-minute poster edits are we talking about?",
    subjectPreload: "Event Idea",
  },
  {
    id: "collab",
    label: "Collaboration",
    subtitle: "Let's make something happen.",
    reaction: "Please confirm that at least one team member will actually push the code.",
    subjectPreload: "Collaboration",
  },
  {
    id: "other",
    label: "Other Issue",
    subtitle: "It's a bit of a long story.",
    reaction: "Tell us the lore. We'll debug the situation together.",
    subjectPreload: "Other Issue",
  },
];

const FAQ_ITEMS = [
  {
    question: "Do I need technical skills to join Abhyudaya?",
    answer: "Not really. We need people who can code, design, manage events, handle PR, and occasionally reply to messages. Being useful comes in many forms.",
  },
  {
    question: "My CGPA is fighting for its life. Can I still join?",
    answer: "Yes. Abhyudaya is a club, not a supplementary exam. Just learn to manage your time before your deadlines start managing you.",
  },
  {
    question: "How quickly will you reply?",
    answer: "Usually within 24–48 hours. Unless assignments and attendance decide otherwise.",
  },
  {
    question: "Can I suggest an event even if I'm not an admin?",
    answer: "Of course. You don't need admin access to have ideas. Getting everyone to agree on them is the actual boss level.",
  },
  {
    question: "What if my idea sounds completely crazy?",
    answer: "Pitch it. We've heard worse ideas in group projects. Just bring something more convincing than “bro, trust me.”",
  },
  {
    question: "Can I contribute if I have no experience?",
    answer: "Yes. Experience comes with doing things. Confidence without contribution is just a LinkedIn headline.",
  },
  {
    question: "Can I join just for the snacks?",
    answer: "We respect the honesty. But this is a Science & Literary Club, not a food court. Snacks are a possibility, not a placement guarantee.",
  },
  {
    question: "What if I submit a message twice?",
    answer: "We'll probably receive it twice. Give us time to reply before turning one enquiry into a follow-up campaign.",
  },
];

export default function Contact() {
  const gridRef = useReveal();
  const faqRef = useReveal();

  const [formState, setFormState] = useState(INITIAL_FORM);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [activeReaction, setActiveReaction] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedStatus, setSubmittedStatus] = useState(null);
  const [openFaqIndices, setOpenFaqIndices] = useState(() => new Set());

  const breadcrumbItems = [
    { name: "Home", url: SITE_URL },
    { name: "Contact", url: `${SITE_URL}/contact` },
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const validate = () => {
    const newErrors = {};
    const nameTrim = formState.name.trim();
    const emailTrim = formState.email.trim();
    const messageTrim = formState.message.trim();

    if (!nameTrim) {
      newErrors.name = "Please enter your name.";
    } else if (nameTrim.length < 2) {
      newErrors.name = "Name must be at least 2 characters.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailTrim) {
      newErrors.email = "Please enter your email address.";
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
      newErrors.message = "Please enter a message before sending.";
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

  const handleSelectIssue = (issue) => {
    if (selectedIssue === issue.id) {
      // Toggle off if clicked again
      setSelectedIssue(null);
      setActiveReaction(null);
    } else {
      setSelectedIssue(issue.id);
      setActiveReaction(issue.reaction);
      // Automatically populate subject
      setFormState((prev) => ({
        ...prev,
        subject: issue.subjectPreload,
      }));
    }
  };

  const handleFormSubmit = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

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
        title: "Message sent!",
        message: "Thanks for reaching out! We've received your note and will get back to you soon.",
      });
      setFormState(INITIAL_FORM);
      setSelectedIssue(null);
      setActiveReaction(null);
      setErrors({});
    } catch (err) {
      console.error("Error submitting contact message:", err);
      setSubmittedStatus({
        success: false,
        title: "Message couldn't be sent",
        message: err.message || "Your message hasn't gone through. Please try again in a moment.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFaq = (index) => {
    setOpenFaqIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const mapQuery = encodeURIComponent(`${club.institute}, ${club.department}`);

  return (
    <>
      <Helmet>
        <title>Contact Us | Abhyudaya Club — MPEC Kanpur</title>
        <meta
          name="description"
          content="Contact Abhyudaya Club at MPEC Kanpur. Reach out for collaborations, sponsorships, bug reports, event ideas, or to connect with the team."
        />
        <link rel="canonical" href={`${SITE_URL}/contact`} />
        <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1" />

        <meta property="og:type" content="website" />
        <meta property="og:title" content="Contact Abhyudaya Club | MPEC Kanpur" />
        <meta
          property="og:description"
          content="Big idea, random doubt, or just bored? We're here. Reach out to Abhyudaya Club at MPEC Kanpur."
        />
        <meta property="og:url" content={`${SITE_URL}/contact`} />
        <meta property="og:image" content={`${SITE_URL}/abhyudaya-logo.png`} />
        <meta property="og:locale" content="en_IN" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Contact Abhyudaya Club | MPEC Kanpur" />
        <meta
          name="twitter:description"
          content="Big idea, random doubt, or just bored? We're here. Reach out to Abhyudaya Club at MPEC Kanpur."
        />
        <meta name="twitter:image" content={`${SITE_URL}/abhyudaya-logo.png`} />

        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <BreadcrumbSchema items={breadcrumbItems} />

      {/* Redesigned Hero Section */}
      <header className="page-hero contact-hero" aria-label="Contact Module Hero">
        <div className="wrap contact-hero__wrap">
          <div className="contact-hero__content">

            <h1 className="contact-hero__title">
              {"Have a Question? Contact Us."}
            </h1>

            <p className="contact-hero__lede">
              {"Have a question, suggestion, or feedback? Send us a message. We'll be happy to hear from you."}
            </p>

            {/* Terminal Interface Console */}
            <div className="contact-terminal" aria-label="Terminal output greeting">
              <div className="contact-terminal__bar">
                <div className="terminal-dots" aria-hidden="true">
                  <span className="terminal-dot terminal-dot--red" />
                  <span className="terminal-dot terminal-dot--yellow" />
                  <span className="terminal-dot terminal-dot--green" />
                </div>
                <span className="contact-terminal__title">bash ~ contact-session</span>
              </div>
              <div className="contact-terminal__body">
                <div className="terminal-line terminal-line--cmd">
                  <span className="terminal-prompt">root@abhyudaya:~$</span>
                  <span className="terminal-exec">./say_hello.sh</span>
                </div>
                <div className="terminal-line terminal-line--output">
                  <span className="terminal-out-arrow" aria-hidden="true">↳</span>
                  <span className="terminal-out-msg">Oh hey, you made it! 👋</span>
                </div>
                <div className="terminal-line terminal-line--output">
                  <span className="terminal-out-arrow" aria-hidden="true">↳</span>
                  <span className="terminal-out-msg">{"What's the scene? We're listening."}</span>
                  <span className="terminal-cursor" aria-hidden="true">_</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="page-hero__horizon" />
      </header>

      {/* Main Content Grid */}
      <section className="section contact-section">
        <div className="wrap contact-grid" ref={gridRef}>
          {/* Left Column: Campus Node & Channels */}
          <aside className="contact-info">
            {/* Campus Location & Map Card */}
            <div className="contact-info__block contact-location-card reveal">
              <div className="contact-location-info">
                <p className="eyebrow contact-eyebrow">📍 Physical Server Location</p>
                <h2 className="contact-location-title">{club.institute}</h2>
                <p className="contact-info__text">{club.department}</p>
              </div>

              {/* Map */}
              <div className="contact-map">
                <iframe
                  title="Club location map"
                  className="contact-map__frame"
                  src={`https://maps.google.com/maps?q=${mapQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>

            {/* Direct Inquiries & Social Channels Card */}
            <div className="contact-info__block contact-channels-card reveal">
              <div className="contact-channel-item">
                <h2 className="contact-email-heading">Got a question? Email us.</h2>
                <p className="contact-eyebrow" style={{ marginTop: "10px" }}>DROP US A MAIL</p>
                <a
                  href={`mailto:${socials.email}`}
                  className="contact-info__email"
                  aria-label={`Send email to ${socials.email}`}
                >
                  {socials.email}
                </a>
                <span className="contact-response-badge">Replies usually take 24–48 hours. Unless assignments have other plans.</span>
              </div>

              <div className="contact-channel-divider" />

              <div className="contact-channel-item">
                <p className="contact-social-intro">Stalking us on socials is also acceptable.</p>
                <div className="contact-info__socials">
                  <a
                    href={socials.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-pill social-pill--instagram"
                  >
                    Instagram ↗
                  </a>
                  <a
                    href={socials.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-pill social-pill--linkedin"
                  >
                    LinkedIn ↗
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
          </aside>

          {/* Right Column: Contact Inquiry Form Card */}
          <main className="join-card contact-form-card reveal">
            <div className="contact-card-header">
              <h2 className="contact-card-title">{"What's on your mind?"}</h2>
              <p className="contact-card-sub">
                {"Pick a topic or skip straight to the form. Science, literature, events, website bugs — it's all welcome."}
              </p>
            </div>

            {/* Interactive Issue Selector */}
            <div className="issue-selector-wrapper" role="radiogroup" aria-label="Select inquiry category">
              <span className="issue-selector-label">Choose a topic (optional):</span>
              <div className="issue-selector-grid">
                {ISSUE_OPTIONS.map((item) => {
                  const isSelected = selectedIssue === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      className={`issue-card ${isSelected ? "is-selected" : ""}`}
                      onClick={() => handleSelectIssue(item)}
                    >
                      <strong className="issue-card__title">{item.label}</strong>
                      <span className="issue-card__subtitle">{item.subtitle}</span>
                    </button>
                  );
                })}
              </div>

              {activeReaction && (
                <div className="issue-reaction-box" role="status" aria-live="polite">
                  <p className="reaction-text">{activeReaction}</p>
                </div>
              )}
            </div>

            {/* Submission Alerts */}
            {submittedStatus && (
              <div
                className={`contact-alert ${
                  submittedStatus.success ? "contact-alert--success" : "contact-alert--error"
                }`}
                role="alert"
              >
                <div className="contact-alert__icon" aria-hidden="true">
                  {submittedStatus.success ? "✓" : "⚠"}
                </div>
                <div className="contact-alert__content">
                  <strong className="contact-alert__title">{submittedStatus.title}</strong>
                  <p>{submittedStatus.message}</p>
                  {!submittedStatus.success && (
                    <button
                      type="button"
                      onClick={handleFormSubmit}
                      className="contact-retry-btn"
                    >
                      Try again ↺
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Contact Form */}
            <form onSubmit={handleFormSubmit} className="contact-form" noValidate>
              <div className="form-group form-group--name">
                <label htmlFor="contact-name" className="form-label">
                  <span>Your name</span>
                  <span className="req" aria-hidden="true">*</span>
                </label>
                <input
                  id="contact-name"
                  type="text"
                  name="name"
                  value={formState.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Anurag Verma"
                  className={`contact-input ${errors.name ? "has-error" : ""}`}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? "name-error" : undefined}
                  disabled={submitting}
                  required
                />
                {errors.name && (
                  <span id="name-error" className="field-error" role="alert">
                    {errors.name}
                  </span>
                )}
              </div>

              <div className="form-group form-group--email">
                <label htmlFor="contact-email" className="form-label">
                  <span>Email address</span>
                  <span className="req" aria-hidden="true">*</span>
                </label>
                <input
                  id="contact-email"
                  type="email"
                  name="email"
                  value={formState.email}
                  onChange={handleInputChange}
                  placeholder="e.g. yourname@domain.com"
                  className={`contact-input ${errors.email ? "has-error" : ""}`}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  disabled={submitting}
                  required
                />
                {errors.email && (
                  <span id="email-error" className="field-error" role="alert">
                    {errors.email}
                  </span>
                )}
              </div>

              <div className="form-group form-group--phone">
                <label htmlFor="contact-phone" className="form-label">
                  <span>Phone number (optional)</span>
                  <span className="opt">Optional</span>
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
                  <span id="phone-error" className="field-error" role="alert">
                    {errors.phone}
                  </span>
                )}
              </div>

              <div className="form-group form-group--subject">
                <label htmlFor="contact-subject" className="form-label">
                  <span>Subject</span>
                  <span className="opt">Optional</span>
                </label>
                <input
                  id="contact-subject"
                  type="text"
                  name="subject"
                  value={formState.subject}
                  onChange={handleInputChange}
                  placeholder="e.g. Event Collaboration, Bug Report, Workshop Idea..."
                  className="contact-input"
                  disabled={submitting}
                />
              </div>

              <div className="form-group form-group--message form-group--full">
                <label htmlFor="contact-message" className="form-label">
                  <span>Your message</span>
                  <span className="req" aria-hidden="true">*</span>
                </label>
                <textarea
                  id="contact-message"
                  rows="5"
                  name="message"
                  value={formState.message}
                  onChange={handleInputChange}
                  placeholder="Explain your idea, report the bug, pitch your event, or tell us what's on your mind."
                  className={`contact-input contact-textarea ${errors.message ? "has-error" : ""}`}
                  aria-invalid={Boolean(errors.message)}
                  aria-describedby={errors.message ? "message-error" : undefined}
                  disabled={submitting}
                  required
                />
                {errors.message && (
                  <span id="message-error" className="field-error" role="alert">
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
                    <span>Sending your message...</span>
                  </span>
                ) : (
                  <span className="contact-submit-text">
                    <span>{`git commit -m "${formState.subject || ""}"`}</span>
                    <span className="contact-submit-arrow" aria-hidden="true">
                      →
                    </span>
                  </span>
                )}
              </button>
            </form>

            <div className="contact-card-footer">
              <span className="footer-terminal-char" aria-hidden="true">{"//"}</span>
              <p className="contact-card-footer-note">
                Made with curiosity, caffeine, and at least one unresolved Git conflict.
              </p>
            </div>
          </main>
        </div>
      </section>

      {/* CSE-Themed FAQ Accordion Section */}
      <section className="section faq-section" aria-labelledby="faq-heading">
        <div className="wrap">
          <div className="faq-card" ref={faqRef}>
            <div className="faq-header">
              <span className="faq-badge">KNOWLEDGE_BASE.LOG</span>
              <h2 id="faq-heading" className="faq-title">Frequently Asked Questions</h2>
              <p className="faq-sub">
                Answers to edge cases, CGPA queries, sanity checks, and snack policies.
              </p>
            </div>

            <div className="faq-accordion" role="region" aria-label="FAQ Accordion">
              {FAQ_ITEMS.map((item, idx) => {
                const isOpen = openFaqIndices.has(idx);
                const buttonId = `faq-btn-${idx}`;
                const panelId = `faq-panel-${idx}`;
                return (
                  <div
                    key={idx}
                    className={`faq-accordion-item${isOpen ? " is-open" : ""}`}
                  >
                    <button
                      type="button"
                      id={buttonId}
                      className="faq-accordion-trigger"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => toggleFaq(idx)}
                    >
                      <span className="faq-accordion-q">
                        <span className="faq-q-num">Q{idx + 1}.</span>
                        <span className="faq-q-text">{item.question}</span>
                      </span>
                      <span className="faq-accordion-icon" aria-hidden="true">
                        <span className="faq-icon-line faq-icon-line--h" />
                        <span className="faq-icon-line faq-icon-line--v" />
                      </span>
                    </button>
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      className="faq-accordion-content"
                    >
                      <div className="faq-accordion-inner">
                        <p>{item.answer}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
