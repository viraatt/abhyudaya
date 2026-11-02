import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase.js";

const POLLS_COLLECTION = "polls";
const pollsRef = collection(db, POLLS_COLLECTION);

/**
 * Computes the real-time computed status of a poll based on timestamps
 * @param {object} poll
 * @returns {"draft"|"scheduled"|"active"|"closed"|"archived"}
 */
export function computePollStatus(poll) {
  if (!poll) return "closed";
  if (poll.archived || poll.status === "archived") return "archived";
  if (poll.status === "draft") return "draft";
  if (poll.status === "closed") return "closed";

  const now = Date.now();
  const startMs = toMillis(poll.startAt);
  const endMs = toMillis(poll.endAt);

  if (startMs && now < startMs) {
    return "scheduled";
  }
  if (endMs && now > endMs) {
    return "closed";
  }
  return "active";
}

/**
 * Normalizes Firestore timestamp, ISO string, or Date into milliseconds
 */
export function toMillis(val) {
  if (!val) return 0;
  if (typeof val.toMillis === "function") return val.toMillis();
  if (val.seconds) return val.seconds * 1000;
  if (typeof val === "number") return val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

/**
 * Formats date-time nicely
 */
export function formatPollDateTime(val) {
  const ms = toMillis(val);
  if (!ms) return "—";
  return new Date(ms).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Creates a new poll
 */
export async function createPoll(pollData, user) {
  const newDocRef = doc(pollsRef);

  // Generate unique IDs for options if missing
  const sanitizedOptions = (pollData.options || []).map((opt, idx) => ({
    id: opt.id || `opt_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
    text: (opt.text || "").trim(),
    imageUrl: opt.imageUrl ? opt.imageUrl.trim() : "",
    voteCount: 0,
  }));

  if (sanitizedOptions.length < 2) {
    throw new Error("A poll must have at least 2 voting options.");
  }

  const startAt = pollData.startAt ? new Date(pollData.startAt) : new Date();
  const endAt = pollData.endAt ? new Date(pollData.endAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const payload = {
    title: (pollData.title || "").trim(),
    description: (pollData.description || "").trim(),
    bannerImage: (pollData.bannerImage || "").trim(),
    category: (pollData.category || "General").trim(),
    options: sanitizedOptions,
    status: pollData.status || "active", // draft | active | scheduled | closed
    allowMultiple: Boolean(pollData.allowMultiple),
    showLiveResults: pollData.showLiveResults !== false,
    requireAuth: true,
    createdBy: user?.displayName || user?.email || "Abhyudaya Admin",
    createdByUid: user?.uid || null,
    totalVotes: 0,
    totalParticipants: 0,
    startAt: Timestamp.fromDate(startAt),
    endAt: Timestamp.fromDate(endAt),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    archived: false,
  };

  await setDoc(newDocRef, payload);
  return { id: newDocRef.id, ...payload };
}

/**
 * Updates an existing poll
 */
export async function updatePoll(pollId, updates) {
  if (!pollId) throw new Error("Poll ID is required.");
  const pollRef = doc(db, POLLS_COLLECTION, pollId);

  const payload = { ...updates, updatedAt: serverTimestamp() };

  if (updates.startAt && !(updates.startAt instanceof Timestamp)) {
    payload.startAt = Timestamp.fromDate(new Date(updates.startAt));
  }
  if (updates.endAt && !(updates.endAt instanceof Timestamp)) {
    payload.endAt = Timestamp.fromDate(new Date(updates.endAt));
  }

  await updateDoc(pollRef, payload);
  return { id: pollId, ...payload };
}

/**
 * Fetches single poll by ID
 */
export async function getPoll(pollId) {
  if (!pollId) return null;
  const pollRef = doc(db, POLLS_COLLECTION, pollId);
  const snap = await getDoc(pollRef);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    ...data,
    computedStatus: computePollStatus(data),
  };
}

/**
 * Fetches all polls (sorted by creation date descending)
 */
export async function getAllPolls() {
  const q = query(pollsRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      computedStatus: computePollStatus(data),
    };
  });
}

/**
 * Subscribes to real-time updates for a single poll
 */
export function subscribePoll(pollId, onUpdate, onError) {
  if (!pollId) return () => {};
  const pollRef = doc(db, POLLS_COLLECTION, pollId);
  return onSnapshot(
    pollRef,
    (snap) => {
      if (!snap.exists()) {
        onUpdate(null);
        return;
      }
      const data = snap.data();
      onUpdate({
        id: snap.id,
        ...data,
        computedStatus: computePollStatus(data),
      });
    },
    (err) => {
      console.error(`[pollService] Error listening to poll ${pollId}:`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribes to real-time updates for all polls
 */
export function subscribeAllPolls(onUpdate, onError) {
  const q = query(pollsRef, orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const polls = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          computedStatus: computePollStatus(data),
        };
      });
      onUpdate(polls);
    },
    (err) => {
      console.error("[pollService] Error listening to all polls:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * Closes a poll manually
 */
export async function closePoll(pollId) {
  if (!pollId) throw new Error("Poll ID is required.");
  const pollRef = doc(db, POLLS_COLLECTION, pollId);
  await updateDoc(pollRef, {
    status: "closed",
    closedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Archives a poll
 */
export async function archivePoll(pollId, archive = true) {
  if (!pollId) throw new Error("Poll ID is required.");
  const pollRef = doc(db, POLLS_COLLECTION, pollId);
  await updateDoc(pollRef, {
    archived: Boolean(archive),
    status: archive ? "archived" : "closed",
    updatedAt: serverTimestamp(),
  });
}

/**
 * Deletes a poll document
 */
export async function deletePoll(pollId) {
  if (!pollId) throw new Error("Poll ID is required.");
  const pollRef = doc(db, POLLS_COLLECTION, pollId);
  await deleteDoc(pollRef);
}

/**
 * Duplicates an existing poll as a Draft with reset vote counts
 */
export async function duplicatePoll(pollId, user) {
  const original = await getPoll(pollId);
  if (!original) throw new Error("Original poll not found.");

  const resetOptions = (original.options || []).map((opt, idx) => ({
    id: `opt_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
    text: opt.text,
    imageUrl: opt.imageUrl || "",
    voteCount: 0,
  }));

  const newDocRef = doc(pollsRef);
  const now = new Date();
  const weekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const payload = {
    title: `${original.title} (Copy)`,
    description: original.description || "",
    bannerImage: original.bannerImage || "",
    category: original.category || "General",
    options: resetOptions,
    status: "draft",
    allowMultiple: Boolean(original.allowMultiple),
    showLiveResults: original.showLiveResults !== false,
    requireAuth: true,
    createdBy: user?.displayName || user?.email || "Abhyudaya Admin",
    createdByUid: user?.uid || null,
    totalVotes: 0,
    totalParticipants: 0,
    startAt: Timestamp.fromDate(now),
    endAt: Timestamp.fromDate(weekLater),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    archived: false,
  };

  await setDoc(newDocRef, payload);
  return { id: newDocRef.id, ...payload };
}

/**
 * Checks if a user has already cast a vote in a poll
 * @param {string} pollId
 * @param {string} userId
 * @returns {Promise<{voted: boolean, vote: object|null}>}
 */
export async function getUserVote(pollId, userId) {
  if (!pollId || !userId) return { voted: false, vote: null };
  try {
    const voteRef = doc(db, POLLS_COLLECTION, pollId, "votes", userId);
    const voteSnap = await getDoc(voteRef);
    if (voteSnap.exists()) {
      return { voted: true, vote: voteSnap.data() };
    }
    return { voted: false, vote: null };
  } catch (err) {
    console.error("[pollService] getUserVote error:", err);
    return { voted: false, vote: null };
  }
}

/**
 * Submits a vote using Server API (with atomic Firestore transaction fallback).
 * Guarantees duplicate vote prevention, timing validation, and accurate aggregate counts.
 *
 * @param {string} pollId
 * @param {string[]} selectedOptions Array of selected option IDs
 * @param {object} user Firebase User object
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function submitVote(pollId, selectedOptions, user) {
  if (!user || !user.uid) {
    throw new Error("You must be signed in to vote.");
  }
  if (!pollId) {
    throw new Error("Invalid poll ID.");
  }
  if (!Array.isArray(selectedOptions) || selectedOptions.length === 0) {
    throw new Error("Please select at least one voting option.");
  }

  // 1. Attempt Server-side Trusted Vote Submission
  try {
    const idToken = typeof user.getIdToken === "function" ? await user.getIdToken() : null;
    if (idToken) {
      const response = await fetch("/api/polls/vote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          pollId,
          selectedOptions,
        }),
      });

      if (response.ok) {
        const resData = await response.json();
        return resData;
      }

      // If response is a client/validation error (e.g. 400, 403, 409), throw server's message directly
      if (response.status >= 400 && response.status < 500) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || errJson.message || "Vote could not be processed.");
      }
    }
  } catch (apiErr) {
    // If it's a known validation error from server (e.g. already voted), propagate it
    if (
      apiErr.message.includes("already voted") ||
      apiErr.message.includes("closed") ||
      apiErr.message.includes("not active") ||
      apiErr.message.includes("single-choice")
    ) {
      throw apiErr;
    }
    console.warn("[pollService] Server API vote endpoint fallback to Firestore transaction:", apiErr.message);
  }

  // 2. Client-side Atomic Firestore Transaction (Secure fallback governed by firestore.rules)
  const pollRef = doc(db, POLLS_COLLECTION, pollId);
  const voteRef = doc(db, POLLS_COLLECTION, pollId, "votes", user.uid);

  return await runTransaction(db, async (transaction) => {
    // Check if user already voted
    const existingVoteSnap = await transaction.get(voteRef);
    if (existingVoteSnap.exists()) {
      throw new Error("You have already voted in this poll. Duplicate voting is prevented.");
    }

    // Read poll document
    const pollSnap = await transaction.get(pollRef);
    if (!pollSnap.exists()) {
      throw new Error("The requested poll does not exist.");
    }

    const poll = pollSnap.data();
    const computedStatus = computePollStatus(poll);

    if (computedStatus !== "active") {
      if (computedStatus === "closed") {
        throw new Error("Voting is closed for this poll.");
      }
      if (computedStatus === "scheduled") {
        throw new Error("Voting has not started yet.");
      }
      throw new Error("This poll is not currently accepting votes.");
    }

    // Single-choice check
    if (!poll.allowMultiple && selectedOptions.length > 1) {
      throw new Error("This is a single-choice poll. Only one option can be selected.");
    }

    // Verify option IDs exist
    const validOptionIds = new Set((poll.options || []).map((o) => o.id));
    for (const optId of selectedOptions) {
      if (!validOptionIds.has(optId)) {
        throw new Error("One or more selected options are invalid.");
      }
    }

    // Compute updated option counts
    const updatedOptions = (poll.options || []).map((opt) => {
      if (selectedOptions.includes(opt.id)) {
        return {
          ...opt,
          voteCount: (opt.voteCount || 0) + 1,
        };
      }
      return opt;
    });

    const newTotalVotes = (poll.totalVotes || 0) + selectedOptions.length;
    const newTotalParticipants = (poll.totalParticipants || 0) + 1;

    // Create vote document
    transaction.set(voteRef, {
      userId: user.uid,
      userEmail: user.email || "",
      userName: user.displayName || "",
      selectedOptions,
      pollId,
      submittedAt: serverTimestamp(),
    });

    // Update poll totals
    transaction.update(pollRef, {
      options: updatedOptions,
      totalVotes: newTotalVotes,
      totalParticipants: newTotalParticipants,
      updatedAt: serverTimestamp(),
    });

    return {
      success: true,
      message: "Vote cast successfully!",
      selectedOptions,
    };
  });
}

/**
 * Fetches all votes for a poll (admin only)
 */
export async function getPollVotes(pollId) {
  if (!pollId) return [];
  const votesRef = collection(db, POLLS_COLLECTION, pollId, "votes");
  const q = query(votesRef, orderBy("submittedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
}

/**
 * Exports poll results to CSV file download
 */
export function exportPollResultsCSV(poll, votes = []) {
  if (!poll) return;

  const totalParticipants = poll.totalParticipants || 0;
  const totalVotes = poll.totalVotes || 0;

  // Header and Poll summary
  let csv = `Abhyudaya Club - Poll Results Export\r\n`;
  csv += `Poll Title,"${(poll.title || "").replace(/"/g, '""')}"\r\n`;
  csv += `Status,"${poll.computedStatus || poll.status || ""}"\r\n`;
  csv += `Start Date,"${formatPollDateTime(poll.startAt)}"\r\n`;
  csv += `Closing Date,"${formatPollDateTime(poll.endAt)}"\r\n`;
  csv += `Voting Type,"${poll.allowMultiple ? "Multiple-choice" : "Single-choice"}"\r\n`;
  csv += `Total Participants,${totalParticipants}\r\n`;
  csv += `Total Votes Cast,${totalVotes}\r\n\r\n`;

  // Option-wise breakdown
  csv += `Option ID,Option Title,Votes Received,Percentage\r\n`;
  (poll.options || []).forEach((opt, idx) => {
    const count = opt.voteCount || 0;
    const pct = totalVotes > 0 ? ((count / totalVotes) * 100).toFixed(1) : "0.0";
    csv += `"${opt.id}","${(opt.text || `Option ${idx + 1}`).replace(/"/g, '""')}",${count},${pct}%\r\n`;
  });

  // Individual vote submission logs (anonymized safe summary)
  if (votes && votes.length > 0) {
    csv += `\r\nVote Submissions Log (${votes.length} Records)\r\n`;
    csv += `Voter UID,Selected Options,Submitted At\r\n`;
    votes.forEach((v) => {
      const optionTexts = (v.selectedOptions || [])
        .map((optId) => {
          const matching = (poll.options || []).find((o) => o.id === optId);
          return matching ? matching.text : optId;
        })
        .join("; ");
      const timeStr = formatPollDateTime(v.submittedAt);
      csv += `"${v.userId}","${optionTexts.replace(/"/g, '""')}","${timeStr}"\r\n`;
    });
  }

  // Trigger download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const filename = `poll_${(poll.title || "export").toLowerCase().replace(/[^a-z0-9]+/g, "_")}_results.csv`;
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
