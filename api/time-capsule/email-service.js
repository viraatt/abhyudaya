/* global process */
/**
 * Abhyudaya Time Capsule — Transactional Email Delivery Service
 * Provider-agnostic abstraction supporting Resend, Brevo, and Mock/Test modes.
 *
 * Strictly enforces privacy:
 * - NEVER embeds capsule answers, phone numbers, internal IDs, or token hashes.
 * - Escapes student names to prevent HTML injection.
 * - Credentials are kept strictly server-side.
 */

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Builds the responsive HTML body for the Time Capsule unlock email.
 */
function buildEmailHtml({ studentName, unlockUrl, capsuleCode }) {
  const safeName = escapeHtml(studentName || "Student");
  const safeCode = escapeHtml(capsuleCode || "");
  const safeUrl = escapeHtml(unlockUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Abhyudaya Time Capsule is Ready 📦</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #111827;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
    }
    .wrapper {
      max-width: 600px;
      margin: 30px auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: #0d1322;
      color: #fbf4e8;
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0 0 8px 0;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    .header-badge {
      display: inline-block;
      background: rgba(238, 184, 74, 0.2);
      border: 1px solid rgba(238, 184, 74, 0.4);
      color: #eeb84a;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 3px 10px;
      border-radius: 20px;
    }
    .content {
      padding: 32px 28px;
    }
    .greeting {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    .message {
      font-size: 15px;
      color: #334155;
      margin-bottom: 16px;
    }
    .quote-box {
      background: #f1f5f9;
      border-left: 4px solid #eeb84a;
      padding: 14px 18px;
      border-radius: 0 8px 8px 0;
      margin: 24px 0;
      font-size: 14px;
      color: #1e293b;
      font-style: italic;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0;
    }
    .btn {
      display: inline-block;
      background: #0d1322;
      color: #eeb84a !important;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 30px;
      font-weight: 700;
      font-size: 15px;
      letter-spacing: 0.02em;
      box-shadow: 0 4px 10px rgba(13, 19, 34, 0.2);
    }
    .reference {
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      padding: 12px;
      border-radius: 8px;
      font-size: 13px;
      color: #64748b;
      text-align: center;
      margin-bottom: 24px;
    }
    .footer {
      background: #f8fafc;
      padding: 20px 24px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 12px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <span class="header-badge">Abhyudaya Time Capsule</span>
      <h1 style="margin-top: 12px;">Your Time Capsule is Ready 📦</h1>
    </div>
    <div class="content">
      <div class="greeting">Dear ${safeName},</div>
      <p class="message">
        A few years ago, you wrote something for the person you were going to become.
      </p>
      <div class="quote-box">
        "That moment has finally arrived. Your Abhyudaya Time Capsule is ready to open."
      </div>
      <p class="message">
        Open it and see what your past self wanted you to remember about your dreams, fears, and promises on this journey.
      </p>
      <div class="btn-container">
        <a href="${safeUrl}" class="btn" target="_blank" rel="noopener noreferrer">
          Open My Time Capsule 💌
        </a>
      </div>
      ${
        safeCode
          ? `<div class="reference">Capsule Reference Code: <strong>${safeCode}</strong></div>`
          : ""
      }
      <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 16px;">
        If the button does not work, copy and paste this link into your browser:<br>
        <a href="${safeUrl}" style="color: #2563eb; word-break: break-all;">${safeUrl}</a>
      </p>
    </div>
    <div class="footer">
      <p style="margin: 0 0 4px 0;"><strong>Abhyudaya Club</strong> — MPEC Kanpur</p>
      <p style="margin: 0;">This is an automated delivery for your student Time Capsule.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Builds the plain-text alternative body for the email.
 */
function buildEmailText({ studentName, unlockUrl, capsuleCode }) {
  return `Dear ${studentName || "Student"},

A few years ago, you wrote something for the person you were going to become.

That moment has finally arrived.

Your Abhyudaya Time Capsule is ready to open.

Open it and see what your past self wanted you to remember:
${unlockUrl}

${capsuleCode ? `Capsule Reference Code: ${capsuleCode}\n` : ""}
Warm regards,
Abhyudaya Club, MPEC Kanpur
`;
}

/**
 * Dispatches a Time Capsule ready notification email.
 *
 * @param {object} params
 * @param {string} params.to - Student recipient email address
 * @param {string} params.studentName - Full name of the student
 * @param {string} params.unlockUrl - Secure HTTPS URL with token
 * @param {string} [params.capsuleCode] - Reference code (e.g. 'CAP-2029-XXXX')
 * @returns {Promise<{success: boolean, messageId?: string, provider?: string}>}
 */
export async function sendTimeCapsuleEmail({
  to,
  studentName,
  unlockUrl,
  capsuleCode = "",
}) {
  if (!to || !to.includes("@")) {
    throw new Error("Cannot send email: invalid or missing recipient email address.");
  }
  if (!unlockUrl) {
    throw new Error("Cannot send email: missing secure unlock URL.");
  }

  const subject = "Your Abhyudaya Time Capsule is Ready 📦";
  const html = buildEmailHtml({ studentName, unlockUrl, capsuleCode });
  const text = buildEmailText({ studentName, unlockUrl, capsuleCode });

  const from =
    process.env.EMAIL_FROM ||
    "Abhyudaya Time Capsule <capsule@abhyudayaclub.in>";
  const replyTo = process.env.EMAIL_REPLY_TO || "abhyudayaclubmpec@gmail.com";

  const apiKey =
    process.env.EMAIL_API_KEY ||
    process.env.RESEND_API_KEY ||
    process.env.BREVO_API_KEY;

  const providerMode =
    process.env.EMAIL_PROVIDER ||
    (process.env.NODE_ENV === "test" || !apiKey ? "mock" : "resend");

  // ── Mode 1: Mock / Local / Testing Mode ────────────────────────
  if (providerMode === "mock" || !apiKey) {
    return {
      success: true,
      messageId: `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      provider: "mock",
    };
  }

  // ── Mode 2: Brevo / Sendinblue ────────────────────────────────
  if (providerMode === "brevo") {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: { email: from.includes("<") ? from.match(/<([^>]+)>/)[1] : from, name: "Abhyudaya Club" },
        to: [{ email: to, name: studentName }],
        replyTo: { email: replyTo },
        subject,
        htmlContent: html,
        textContent: text,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errMsg = data.message || `Brevo returned HTTP ${res.status}`;
      throw new Error(`Email provider error: ${errMsg}`);
    }

    return {
      success: true,
      messageId: data.messageId || "brevo-sent",
      provider: "brevo",
    };
  }

  // ── Mode 3: Resend (Default) ──────────────────────────────────
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: replyTo,
      subject,
      html,
      text,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errMsg = data.message || `Resend returned HTTP ${res.status}`;
    throw new Error(`Email provider error: ${errMsg}`);
  }

  return {
    success: true,
    messageId: data.id || "resend-sent",
    provider: "resend",
  };
}
