/**
 * Event Normalization Utility
 * 
 * Normalizes event documents from Firestore, static fallbacks, and Admin forms
 * into a consistent, robust schema.
 * 
 * Handles backward-compatibility for:
 * - Direct top-level fields (e.g. event.participants)
 * - Nested stats object (e.g. event.stats.participants)
 * - Nested statistics object (e.g. event.statistics.participants)
 * - Various label keys (e.g. participantsLabel, eventsLabel, editionsLabel)
 */

/**
 * Safely trims and returns a short, editorial description (approx 15–20 words).
 */
export function getConciseDescription(text, maxWords = 18) {
  if (!text || typeof text !== "string") return "";
  
  // Strip any HTML tags
  const clean = text.replace(/<[^>]*>/g, "").trim().replace(/\s+/g, " ");
  if (!clean) return "";

  const words = clean.split(" ");
  if (words.length <= maxWords) return clean;

  const truncated = words.slice(0, maxWords).join(" ");
  // Ensure it ends with a period
  const trimmed = truncated.replace(/[.,;:\-\s]+$/, "");
  return `${trimmed}.`;
}

/**
 * Normalizes an event's statistics into a clean array of { key, value, label }.
 * Only includes statistics that have actual values.
 */
export function extractEventStats(event) {
  if (!event || typeof event !== "object") return [];

  const rawStats = event.statistics || event.stats || {};
  const statsList = [];

  // Helper to extract a single metric safely
  const checkMetric = (key, candidates, defaultLabel) => {
    let value = "";
    for (const val of candidates) {
      if (val !== undefined && val !== null && String(val).trim() !== "" && String(val).trim() !== "0") {
        value = String(val).trim();
        break;
      }
    }
    if (!value) return;

    // Resolve custom label
    let label = defaultLabel;
    const labelCandidates = [
      event[`${key}Label`],
      event[`${key}_label`],
      rawStats[`${key}Label`],
      rawStats[`${key}_label`],
    ];
    for (const lbl of labelCandidates) {
      if (lbl && typeof lbl === "string" && lbl.trim()) {
        label = lbl.trim();
        break;
      }
    }

    statsList.push({
      key,
      value,
      label,
    });
  };

  // 1. Participants
  checkMetric(
    "participants",
    [event.participants, rawStats.participants, rawStats.participantsCount, event.participantsCount],
    "Participants"
  );

  // 2. Activities / Events
  checkMetric(
    "events",
    [event.events, event.activities, rawStats.events, rawStats.activities, rawStats.activitiesCount],
    "Activities"
  );

  // 3. Editions
  checkMetric(
    "editions",
    [event.editions, rawStats.editions, rawStats.editionsCount],
    "Editions"
  );

  // 4. Competitions
  checkMetric(
    "competitions",
    [event.competitions, rawStats.competitions, rawStats.competitionsCount],
    "Competitions"
  );

  // 5. Years Active
  checkMetric(
    "years",
    [event.years, rawStats.years, rawStats.yearsActive],
    "Years Active"
  );

  // 6. Founded / Since
  checkMetric(
    "since",
    [event.since, rawStats.since, rawStats.founded],
    "Since"
  );

  // 7. Speakers (if entered as a count)
  checkMetric(
    "speakers",
    [event.speakersCount, rawStats.speakers, rawStats.speakersCount],
    "Speakers"
  );

  // 8. Projects / Prototypes
  checkMetric(
    "projects",
    [event.projects, rawStats.projects, rawStats.projectsCount],
    "Projects"
  );

  return statsList;
}

/**
 * Main normalization function for an event object.
 */
export function normalizeEvent(event) {
  if (!event || typeof event !== "object") return null;

  const rawImage = event.image || event.banner || event.thumbnail || "";
  const fullDesc = (event.longDescription || event.description || "").trim();
  const shortDesc = (event.shortDescription || "").trim() || getConciseDescription(fullDesc || event.tagline, 18);

  const statsList = extractEventStats(event);

  return {
    ...event,
    id: event.id || event.slug || "",
    slug: event.slug || event.id || "",
    title: event.title || "Untitled Event",
    subtitle: event.subtitle || event.category || "Special Event",
    category: event.category || event.subtitle || "Events",
    icon: event.icon || "📅",
    tagline: (event.tagline || "").trim(),
    shortDescription: shortDesc,
    longDescription: fullDesc,
    description: fullDesc || shortDesc,
    image: rawImage,
    banner: rawImage,
    statistics: statsList,
    // Provide direct accessors for convenience
    hasStats: statsList.length > 0,
    participants: statsList.find((s) => s.key === "participants")?.value || event.participants || "",
    participantsLabel: statsList.find((s) => s.key === "participants")?.label || event.participantsLabel || "Participants",
    events: statsList.find((s) => s.key === "events")?.value || event.events || "",
    eventsLabel: statsList.find((s) => s.key === "events")?.label || event.eventsLabel || "Activities",
    editions: statsList.find((s) => s.key === "editions")?.value || event.editions || "",
    editionsLabel: statsList.find((s) => s.key === "editions")?.label || event.editionsLabel || "Editions",
    since: statsList.find((s) => s.key === "since")?.value || event.since || "",
    competitions: statsList.find((s) => s.key === "competitions")?.value || event.competitions || "",
    competitionsLabel: statsList.find((s) => s.key === "competitions")?.label || event.competitionsLabel || "Competitions",
  };
}
