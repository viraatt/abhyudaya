/**
 * Shared registration status + formatting utilities.
 * Used by the public registration page, admin registrations page,
 * and event management dashboard.
 */

/**
 * Determines the registration status for an event.
 *
 * Priority: CLOSED → FULL → CLOSING_SOON → OPEN
 *
 * @param {object} event - event object with optional `registrationDeadline` and `maxRegistrations`
 * @param {number} currentCount - current number of registrations
 * @returns {{status: string, label: string, color: string}}
 */
export function getRegistrationStatus(event, currentCount) {
  const now = new Date();

  // 1. CLOSED — deadline passed
  if (event?.registrationDeadline) {
    const deadline = new Date(event.registrationDeadline);
    if (!isNaN(deadline) && deadline < now) {
      return { status: "CLOSED", label: "Registration Closed", color: "#ef4444" };
    }
  }

  // 2. FULL — capacity reached
  if (event?.maxRegistrations && currentCount >= Number(event.maxRegistrations)) {
    return { status: "FULL", label: "Fully Booked", color: "#ef4444" };
  }

  // 3. CLOSING_SOON — deadline within 3 days
  if (event?.registrationDeadline) {
    const deadline = new Date(event.registrationDeadline);
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    if (!isNaN(deadline) && deadline.getTime() - now.getTime() < threeDays && deadline >= now) {
      return { status: "CLOSING_SOON", label: "Closing Soon", color: "#f59e0b" };
    }
  }

  // 4. OPEN
  return { status: "OPEN", label: "Registration Open", color: "#22c55e" };
}

/**
 * Formats a Firestore timestamp or date string into a readable date.
 *
 * @param {*} ts
 * @param {object} options
 * @returns {string}
 */
export function formatDate(ts, options = {}) {
  if (!ts) return "";
  if (ts?.seconds) {
    return new Date(ts.seconds * 1000).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      ...options,
    });
  }
  const d = new Date(ts);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  });
}

/**
 * Formats a Firestore timestamp into a readable date + time.
 *
 * @param {*} ts
 * @returns {string}
 */
export function formatDateTime(ts) {
  if (!ts) return "";
  if (ts?.seconds) {
    return new Date(ts.seconds * 1000).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  const d = new Date(ts);
  if (isNaN(d)) return "";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Determines the event lifecycle status: "completed", "ongoing", or "upcoming".
 *
 * @param {object} event
 * @returns {"completed" | "ongoing" | "upcoming"}
 */
export function getEventStatus(event) {
  if (!event) return "upcoming";

  // 1. Explicit string status override
  const rawStatus = (
    event.eventStatus ||
    event.eventState ||
    event.lifeCycleStatus ||
    (event.status && !["published", "draft"].includes(String(event.status).toLowerCase()) ? event.status : "")
  );

  if (rawStatus) {
    const s = String(rawStatus).toLowerCase().trim();
    if (["completed", "past", "finished", "ended", "archived", "closed"].includes(s)) {
      return "completed";
    }
    if (["ongoing", "live", "running", "active"].includes(s)) {
      return "ongoing";
    }
    if (["upcoming", "scheduled"].includes(s)) {
      return "upcoming";
    }
  }

  // 2. Explicit boolean flags
  if (event.isCompleted || event.completed) return "completed";
  if (event.isOngoing || event.ongoing) return "ongoing";
  if (event.isUpcoming || event.upcoming) return "upcoming";

  const now = new Date();

  // 3. Event end date check
  if (event.eventEndDate) {
    const endStr = String(event.eventEndDate).trim();
    const endDate = new Date(endStr.includes("T") ? endStr : `${endStr}T23:59:59`);
    if (!isNaN(endDate.getTime())) {
      if (now > endDate) {
        return "completed";
      }
      if (event.eventStartDate) {
        const startStr = String(event.eventStartDate).trim();
        const startDate = new Date(startStr.includes("T") ? startStr : `${startStr}T00:00:00`);
        if (!isNaN(startDate.getTime()) && now >= startDate && now <= endDate) {
          return "ongoing";
        }
      }
    }
  }

  // 4. Event start date check
  if (event.eventStartDate) {
    const startStr = String(event.eventStartDate).trim();
    const startDate = new Date(startStr.includes("T") ? startStr : `${startStr}T00:00:00`);
    if (!isNaN(startDate.getTime())) {
      if (now < startDate) {
        return "upcoming";
      }
      const oneDayMs = 24 * 60 * 60 * 1000;
      if (now.getTime() - startDate.getTime() > oneDayMs) {
        return "completed";
      }
      return "ongoing";
    }
  }

  // 5. Registration deadline check
  if (event.registrationDeadline) {
    const dlStr = String(event.registrationDeadline).trim();
    const deadline = new Date(dlStr.includes("T") ? dlStr : `${dlStr}T23:59:59`);
    if (!isNaN(deadline.getTime()) && now > deadline) {
      return "completed";
    }
  }

  return "upcoming";
}