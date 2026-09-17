import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

const CERTIFICATES_COLLECTION = "certificates";
const COUNTERS_COLLECTION = "certificateCounters";

/**
 * Parses any Certificate ID string into its prefix, numeric portion, and digit padding length.
 * E.g. "ABH-TB26-0001" -> { prefix: "ABH-TB26-", number: 1, minDigits: 4, raw: "ABH-TB26-0001" }
 * E.g. "ABH-TB26-0099" -> { prefix: "ABH-TB26-", number: 99, minDigits: 4, raw: "ABH-TB26-0099" }
 * E.g. "ABH-TB26-0999" -> { prefix: "ABH-TB26-", number: 999, minDigits: 4, raw: "ABH-TB26-0999" }
 * E.g. "CERT26-1"      -> { prefix: "CERT26-", number: 1, minDigits: 1, raw: "CERT26-1" }
 *
 * @param {string} certId
 * @returns {{ prefix: string, number: number, minDigits: number, raw: string }}
 */
export function parseCertificateId(certId) {
  if (!certId || typeof certId !== "string") {
    return { prefix: "ABH-CERT-", number: 1, minDigits: 4, raw: "" };
  }

  const clean = certId.trim();
  const match = clean.match(/^(.*?)(\d+)$/);

  if (!match) {
    // ID does not end with digits (e.g. "ABH-TB26")
    const p = clean.endsWith("-") ? clean : `${clean}-`;
    return {
      prefix: p,
      number: 1,
      minDigits: 4,
      raw: clean,
    };
  }

  const prefix = match[1];
  const digitsStr = match[2];
  const number = parseInt(digitsStr, 10);
  const minDigits = digitsStr.length;

  return {
    prefix,
    number: isNaN(number) ? 1 : number,
    minDigits: Math.max(1, minDigits),
    raw: clean,
  };
}

/**
 * Formats a Certificate ID using the given prefix and number, preserving leading zeros.
 * E.g. ("ABH-TB26-", 11, 4)   -> "ABH-TB26-0011"
 * E.g. ("ABH-TB26-", 100, 4)  -> "ABH-TB26-0100"
 * E.g. ("ABH-TB26-", 1000, 4) -> "ABH-TB26-1000"
 *
 * @param {string} prefix
 * @param {number} number
 * @param {number} minDigits
 * @returns {string}
 */
export function formatCertificateId(prefix, number, minDigits = 4) {
  const padded = String(Math.max(1, number)).padStart(minDigits, "0");
  return `${prefix}${padded}`;
}

/**
 * Creates a safe Firestore document ID for prefix counters.
 * E.g. "ABH-TB26-" -> "ABH-TB26"
 *
 * @param {string} prefix
 * @returns {string}
 */
export function sanitizePrefixForDocId(prefix) {
  return (prefix || "DEFAULT").replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+$/, "");
}

/**
 * Checks if a Certificate ID document already exists in Firestore.
 *
 * @param {string} certId
 * @returns {Promise<boolean>}
 */
export async function checkCertificateIdExists(certId) {
  const cleanId = (certId || "").trim();
  if (!cleanId) return false;

  try {
    const docRef = doc(db, CERTIFICATES_COLLECTION, cleanId);
    const snap = await getDoc(docRef);
    if (snap.exists() && !snap.data()?.isCounter) {
      return true;
    }

    // Secondary fallback lookup on certificateId field
    const q = query(
      collection(db, CERTIFICATES_COLLECTION),
      where("certificateId", "==", cleanId)
    );
    const qSnap = await getDocs(q);
    const nonCounterDoc = qSnap.docs.find((d) => !d.data()?.isCounter && !d.id.startsWith("_counter_"));
    return !!nonCounterDoc;
  } catch (err) {
    console.warn(`[certificateIdService] Error checking existence of ${cleanId}:`, err);
    return false;
  }
}

/**
 * Queries existing certificate documents that share a prefix to find all taken IDs and the maximum numeric suffix.
 *
 * @param {string} prefix
 * @returns {Promise<{ existingIds: Set<string>, maxNumber: number }>}
 */
export async function fetchExistingPrefixInfo(prefix) {
  const existingIds = new Set();
  let maxNumber = 0;

  if (!prefix) {
    return { existingIds, maxNumber };
  }

  try {
    // Query range for this prefix
    const q = query(
      collection(db, CERTIFICATES_COLLECTION),
      where("certificateId", ">=", prefix),
      where("certificateId", "<=", prefix + "\uf8ff")
    );
    const snap = await getDocs(q);

    snap.forEach((d) => {
      if (d.id.startsWith("_counter_") || d.data()?.isCounter) return;
      const certId = d.data()?.certificateId || d.id;
      if (certId && certId.startsWith(prefix)) {
        existingIds.add(certId);
        const parsed = parseCertificateId(certId);
        if (parsed.number > maxNumber) {
          maxNumber = parsed.number;
        }
      }
    });
  } catch (err) {
    console.warn(`[certificateIdService] Prefix range query fallback for "${prefix}":`, err);
  }

  // Also check counter document if present
  try {
    const safePrefixId = sanitizePrefixForDocId(prefix);
    const counterRef = doc(db, CERTIFICATES_COLLECTION, `_counter_${safePrefixId}`);
    const counterSnap = await getDoc(counterRef);
    if (counterSnap.exists()) {
      const recordedLast = Number(counterSnap.data()?.lastAllocatedNumber) || 0;
      if (recordedLast > maxNumber) {
        maxNumber = recordedLast;
      }
    }
  } catch (counterErr) {
    // Non-critical, continue
  }

  return { existingIds, maxNumber };
}

/**
 * Atomically reserves a sequential block of `countNeeded` Certificate IDs for a given prefix.
 * Uses a Firestore transaction on the counter doc to ensure zero race conditions across concurrent sessions.
 *
 * @param {string} prefix
 * @param {number} countNeeded - How many IDs are needed
 * @param {number} minDigits - Minimum zero-padding digits
 * @param {number} baselineNumber - Current highest known number before reservation
 * @param {Set<string>} inBatchReserved - IDs already reserved in memory
 * @returns {Promise<Array<string>>} Array of newly allocated Certificate IDs
 */
export async function reserveSequenceInTransaction(
  prefix,
  countNeeded,
  minDigits = 4,
  baselineNumber = 0,
  inBatchReserved = new Set()
) {
  if (countNeeded <= 0) return [];

  const safePrefixId = sanitizePrefixForDocId(prefix);
  const counterRef = doc(db, CERTIFICATES_COLLECTION, `_counter_${safePrefixId}`);
  const standaloneCounterRef = doc(db, COUNTERS_COLLECTION, safePrefixId);

  const allocatedIds = [];

  await runTransaction(db, async (transaction) => {
    // 1. Transactional read of the counter document
    let currentLast = baselineNumber;
    let counterDocSnap = null;

    try {
      counterDocSnap = await transaction.get(counterRef);
      if (counterDocSnap.exists()) {
        const storedLast = Number(counterDocSnap.data()?.lastAllocatedNumber) || 0;
        currentLast = Math.max(currentLast, storedLast);
      }
    } catch (readErr) {
      console.warn("[certificateIdService] Could not read counter doc in transaction, using baseline:", readErr);
    }

    // 2. Compute the next sequential numbers
    let candidate = currentLast;
    const candidates = [];

    while (candidates.length < countNeeded) {
      candidate += 1;
      const candidateId = formatCertificateId(prefix, candidate, minDigits);
      // Skip if already in the batch's reserved set
      if (!inBatchReserved.has(candidateId)) {
        candidates.push(candidateId);
      }
    }

    const newLastAllocated = candidate;

    // 3. Write back the updated counter atomically
    const counterPayload = {
      isCounter: true,
      prefix,
      minDigits,
      lastAllocatedNumber: newLastAllocated,
      updatedAt: serverTimestamp(),
    };

    transaction.set(counterRef, counterPayload, { merge: true });

    try {
      transaction.set(standaloneCounterRef, counterPayload, { merge: true });
    } catch {
      // Standalone collection write is secondary mirror
    }

    allocatedIds.length = 0;
    allocatedIds.push(...candidates);
  });

  return allocatedIds;
}

/**
 * Main batch allocation engine.
 *
 * Algorithm:
 * 1. Groups items by prefix.
 * 2. Fetches existing Firestore records and latest sequence counters for each prefix.
 * 3. Identifies which requested IDs already exist in Firestore or collide in this batch.
 * 4. Leaves collision-free IDs untouched (changed: false).
 * 5. For colliding IDs, uses Firestore transactions to atomically reserve next sequential IDs (changed: true).
 * 6. Returns detailed allocations and summary metrics.
 *
 * @param {Array<object>} items - CSV rows or participants with requested Certificate ID
 * @param {object} options
 * @param {string} [options.idField="certificateId"] - Key for the requested ID in each item
 * @param {string} [options.nameField="name"] - Key for participant name
 * @param {Set<string>} [options.preReservedIds] - Optional set of already reserved IDs
 * @returns {Promise<{
 *   allocations: Array<{
 *     rowNumber: number,
 *     name: string,
 *     requestedId: string,
 *     finalId: string,
 *     changed: boolean,
 *     prefix: string,
 *     originalRow: object
 *   }>,
 *   summary: {
 *     total: number,
 *     newGenerated: number,
 *     unchanged: number,
 *     reused: number
 *   }
 * }>}
 */
/**
 * Derives a scoped Certificate ID prefix from an event.
 * Examples:
 *  - "Web Dev Workshop" -> "ABH-WDW26-"
 *  - "TechBloom 2.0"    -> "ABH-TB26-"
 *  - "International Conference 2026" -> "ABH-IC26-"
 *
 * @param {object|string} event - Event object with title/name or event title string
 * @returns {string} Prefix string ending with '-' (e.g. "ABH-WDW26-")
 */
export function deriveEventCertPrefix(event) {
  if (!event) return "ABH-CERT26-";
  const title = (typeof event === "string" ? event : (event.title || event.name || "")).trim();
  if (!title) return "ABH-CERT26-";

  // Clean words (ignoring version digits like 2.0 or special symbols)
  const words = title
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, ""))
    .filter(Boolean);

  let initials = "";
  if (words.length >= 2) {
    const alphaWords = words.filter((w) => /^[a-zA-Z]/.test(w));
    if (alphaWords.length >= 2) {
      initials = alphaWords.slice(0, 4).map((w) => w[0].toUpperCase()).join("");
    } else {
      initials = words.slice(0, 3).map((w) => w[0].toUpperCase()).join("");
    }
  } else if (words.length === 1) {
    const single = words[0];
    const uppers = single.match(/[A-Z]/g);
    if (uppers && uppers.length >= 2) {
      initials = uppers.slice(0, 3).join("");
    } else {
      initials = single.slice(0, 3).toUpperCase();
    }
  }

  if (!initials) initials = "EVT";

  const dateStr = typeof event === "object" ? (event.eventStartDate || event.date || "") : "";
  const combined = `${title} ${dateStr}`;
  const yearMatch = combined.match(/\b(20\d{2})\b/);
  const yy = yearMatch ? yearMatch[1].slice(-2) : new Date().getFullYear().toString().slice(-2);

  if (initials.endsWith(yy)) {
    return `ABH-${initials}-`;
  }

  return `ABH-${initials}${yy}-`;
}

export async function allocateCertificateIdsForBatch(items = [], options = {}) {
  const idField = options.idField || "certificateId";
  const nameField = options.nameField || "name";
  const reservedSet = new Set(options.preReservedIds || []);
  const defaultPrefix = options.defaultPrefix || (options.event ? deriveEventCertPrefix(options.event) : "ABH-CERT-");
  const fallbackPrefix = defaultPrefix.endsWith("-") ? defaultPrefix : `${defaultPrefix}-`;

  if (!items || items.length === 0) {
    return {
      allocations: [],
      summary: { total: 0, newGenerated: 0, unchanged: 0, reused: 0 },
    };
  }

  // 1. First pass: parse all requested IDs and identify prefixes
  const parsedItems = items.map((item, index) => {
    const rawId = (
      item[idField] ||
      item.certificateId ||
      item.certificateid ||
      item.id ||
      ""
    ).trim();

    const name = (
      item[nameField] ||
      item.Name ||
      item["Full Name"] ||
      item["Participant Name"] ||
      item.name ||
      `Participant ${index + 1}`
    ).trim();

    const parsed = parseCertificateId(rawId || `${fallbackPrefix}${String(index + 1).padStart(4, "0")}`);
    return {
      rowNumber: index + 1,
      name,
      requestedId: rawId,
      parsed,
      originalRow: item,
      needsRegeneration: false,
      finalId: rawId,
    };
  });

  // Group by prefix
  const prefixGroups = new Map();
  parsedItems.forEach((pItem) => {
    const p = pItem.parsed.prefix;
    if (!prefixGroups.has(p)) {
      prefixGroups.set(p, []);
    }
    prefixGroups.get(p).push(pItem);
  });

  // 2. Check each prefix in Firestore to gather existing IDs and max number
  const prefixInfoMap = new Map();
  for (const [prefix, group] of prefixGroups.entries()) {
    const info = await fetchExistingPrefixInfo(prefix);
    prefixInfoMap.set(prefix, info);
  }

  // 3. Evaluate each item: determine if requestedId is available or taken
  for (const pItem of parsedItems) {
    const { requestedId, parsed } = pItem;
    const prefixInfo = prefixInfoMap.get(parsed.prefix) || { existingIds: new Set(), maxNumber: 0 };

    if (!requestedId) {
      // Empty requested ID must be generated
      pItem.needsRegeneration = true;
      continue;
    }

    const alreadyInDb = prefixInfo.existingIds.has(requestedId);
    const alreadyInBatch = reservedSet.has(requestedId);

    if (alreadyInDb || alreadyInBatch) {
      // Collision detected! Must generate new ID
      pItem.needsRegeneration = true;
    } else {
      // Available! Reserve it immediately for this batch
      reservedSet.add(requestedId);
      pItem.finalId = requestedId;
      pItem.needsRegeneration = false;

      // Update max known number if this requested number is higher
      if (parsed.number > prefixInfo.maxNumber) {
        prefixInfo.maxNumber = parsed.number;
      }
    }
  }

  // 4. For rows needing regeneration, reserve collision-free sequential IDs per prefix
  for (const [prefix, group] of prefixGroups.entries()) {
    const needingRegen = group.filter((item) => item.needsRegeneration);
    if (needingRegen.length === 0) continue;

    const prefixInfo = prefixInfoMap.get(prefix);
    const minDigits = needingRegen[0].parsed.minDigits || 4;

    // Use atomic transaction to allocate the sequential block
    let allocatedList = [];
    try {
      allocatedList = await reserveSequenceInTransaction(
        prefix,
        needingRegen.length,
        minDigits,
        prefixInfo.maxNumber,
        reservedSet
      );
    } catch (txErr) {
      console.warn(`[certificateIdService] Transaction error for ${prefix}, running fallback allocation:`, txErr);
      // Fallback local allocation while strictly checking against Firestore and reservedSet
      let cur = prefixInfo.maxNumber;
      while (allocatedList.length < needingRegen.length) {
        cur += 1;
        const candidate = formatCertificateId(prefix, cur, minDigits);
        if (!reservedSet.has(candidate) && !prefixInfo.existingIds.has(candidate)) {
          allocatedList.push(candidate);
        }
      }
    }

    // Assign allocated IDs to the respective rows
    needingRegen.forEach((item, idx) => {
      const newId = allocatedList[idx];
      item.finalId = newId;
      reservedSet.add(newId);
    });
  }

  // 5. Construct final results and metrics
  let newGeneratedCount = 0;
  let unchangedCount = 0;

  const allocations = parsedItems.map((pItem) => {
    const changed = pItem.needsRegeneration || pItem.requestedId !== pItem.finalId;
    if (changed) {
      newGeneratedCount++;
    } else {
      unchangedCount++;
    }

    return {
      rowNumber: pItem.rowNumber,
      name: pItem.name,
      requestedId: pItem.requestedId || `(Auto ${pItem.parsed.prefix}...)`,
      finalId: pItem.finalId,
      changed,
      prefix: pItem.parsed.prefix,
      originalRow: pItem.originalRow,
    };
  });

  return {
    allocations,
    summary: {
      total: allocations.length,
      newGenerated: newGeneratedCount,
      unchanged: unchangedCount,
      reused: 0, // Explicitly 0: old certificates are never overwritten or reused
    },
  };
}
