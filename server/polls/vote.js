/* global process */
import fs from "fs";
import path from "path";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

let _db = null;
let _auth = null;

function getFirebaseAdmin() {
  if (!_db || !_auth) {
    if (!getApps().length) {
      let cred = null;
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
          cred = cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
        } catch (e) {
          console.warn("[server/polls/vote] Failed to parse FIREBASE_SERVICE_ACCOUNT env var:", e);
        }
      }
      if (!cred) {
        try {
          const saPath = path.resolve(process.cwd(), "firebase-service-account.json");
          if (fs.existsSync(saPath)) {
            const raw = fs.readFileSync(saPath, "utf-8");
            cred = cert(JSON.parse(raw));
          }
        } catch (e) {
          console.warn("[server/polls/vote] Failed to read local firebase-service-account.json:", e);
        }
      }
      initializeApp(cred ? { credential: cred } : {});
    }
    _db = getFirestore();
    _auth = getAuth();
  }
  return { db: _db, auth: _auth };
}

/**
 * Server-authoritative vote endpoint.
 * POST /api/polls/vote
 * Headers: Authorization: Bearer <FirebaseIdToken>
 * Body: { pollId: string, selectedOptions: string[] }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed. Use POST." });
  }

  // 1. Extract and verify ID token
  const authHeader = req.headers.authorization || req.headers.Authorization || "";
  let token = "";
  if (authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  } else if (req.body && req.body.idToken) {
    token = req.body.idToken;
  }

  if (!token) {
    return res.status(401).json({ success: false, error: "Authentication required. No token provided." });
  }

  const { db, auth } = getFirebaseAdmin();
  let decodedUser = null;

  try {
    decodedUser = await auth.verifyIdToken(token);
  } catch (authErr) {
    console.error("[server/polls/vote] verifyIdToken error:", authErr.message);
    return res.status(401).json({ success: false, error: "Invalid or expired authentication token." });
  }

  const userId = decodedUser.uid;
  const userEmail = decodedUser.email || "";

  // 2. Parse request payload
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ success: false, error: "Malformed JSON body." });
    }
  }

  const { pollId, selectedOptions } = body || {};

  if (!pollId || typeof pollId !== "string") {
    return res.status(400).json({ success: false, error: "Missing or invalid pollId." });
  }

  if (!Array.isArray(selectedOptions) || selectedOptions.length === 0) {
    return res.status(400).json({ success: false, error: "selectedOptions must be a non-empty array of option IDs." });
  }

  const pollRef = db.collection("polls").doc(pollId);
  const voteRef = pollRef.collection("votes").doc(userId);

  try {
    const result = await db.runTransaction(async (t) => {
      // Check existing vote
      const existingVote = await t.get(voteRef);
      if (existingVote.exists) {
        throw new Error("ALREADY_VOTED");
      }

      // Check poll status and deadlines
      const pollDoc = await t.get(pollRef);
      if (!pollDoc.exists) {
        throw new Error("POLL_NOT_FOUND");
      }

      const pollData = pollDoc.data();
      const status = pollData.status || "active";
      const now = Date.now();

      // Check start date
      if (pollData.startAt) {
        const startMs = typeof pollData.startAt.toMillis === "function"
          ? pollData.startAt.toMillis()
          : new Date(pollData.startAt).getTime();
        if (startMs && now < startMs) {
          throw new Error("POLL_NOT_STARTED");
        }
      }

      // Check closing date
      if (pollData.endAt) {
        const endMs = typeof pollData.endAt.toMillis === "function"
          ? pollData.endAt.toMillis()
          : new Date(pollData.endAt).getTime();
        if (endMs && now > endMs) {
          throw new Error("POLL_CLOSED");
        }
      }

      if (status !== "active" && status !== "published") {
        throw new Error("POLL_INACTIVE");
      }

      // Validate single-choice restriction
      if (!pollData.allowMultiple && selectedOptions.length > 1) {
        throw new Error("MULTIPLE_OPTIONS_NOT_ALLOWED");
      }

      // Verify options are valid
      const existingOptions = pollData.options || [];
      const validOptionIds = new Set(existingOptions.map((o) => o.id));
      for (const optId of selectedOptions) {
        if (!validOptionIds.has(optId)) {
          throw new Error("INVALID_OPTION");
        }
      }

      // Update options counts atomically
      const updatedOptions = existingOptions.map((opt) => {
        if (selectedOptions.includes(opt.id)) {
          return {
            ...opt,
            voteCount: (opt.voteCount || 0) + 1,
          };
        }
        return opt;
      });

      const newTotalVotes = (pollData.totalVotes || 0) + selectedOptions.length;
      const newTotalParticipants = (pollData.totalParticipants || 0) + 1;

      // Write vote document in subcollection
      t.set(voteRef, {
        userId,
        userEmail,
        userName: decodedUser.name || "",
        selectedOptions,
        pollId,
        submittedAt: FieldValue.serverTimestamp(),
      });

      // Update poll aggregate statistics
      t.update(pollRef, {
        options: updatedOptions,
        totalVotes: newTotalVotes,
        totalParticipants: newTotalParticipants,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        selectedOptions,
        totalVotes: newTotalVotes,
        totalParticipants: newTotalParticipants,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Vote cast successfully!",
      data: result,
    });
  } catch (error) {
    if (error.message === "ALREADY_VOTED") {
      return res.status(409).json({ success: false, error: "You have already voted in this poll. Duplicate voting is prevented." });
    }
    if (error.message === "POLL_NOT_FOUND") {
      return res.status(404).json({ success: false, error: "Poll not found." });
    }
    if (error.message === "POLL_CLOSED") {
      return res.status(400).json({ success: false, error: "Voting is closed for this poll." });
    }
    if (error.message === "POLL_NOT_STARTED") {
      return res.status(400).json({ success: false, error: "Voting for this poll has not started yet." });
    }
    if (error.message === "POLL_INACTIVE") {
      return res.status(400).json({ success: false, error: "This poll is not currently accepting votes." });
    }
    if (error.message === "MULTIPLE_OPTIONS_NOT_ALLOWED") {
      return res.status(400).json({ success: false, error: "This is a single-choice poll. Only one option can be selected." });
    }
    if (error.message === "INVALID_OPTION") {
      return res.status(400).json({ success: false, error: "One or more selected options are invalid." });
    }

    console.error("[server/polls/vote] Transaction error:", error);
    return res.status(500).json({ success: false, error: "Failed to cast vote due to an internal server error." });
  }
}
