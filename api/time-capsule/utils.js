/* global process, Buffer */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

let cachedApp = null;
let cachedDb = null;

/**
 * Initializes and returns the Firebase Admin Firestore instance and helpers.
 */
export function getFirebaseAdmin() {
  if (!cachedApp) {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      cachedApp = existingApps[0];
    } else {
      let serviceAccount = null;

      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
          serviceAccount = typeof process.env.FIREBASE_SERVICE_ACCOUNT === "string"
            ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
            : process.env.FIREBASE_SERVICE_ACCOUNT;
        } catch (err) {
          console.warn("[TimeCapsule] Failed to parse FIREBASE_SERVICE_ACCOUNT env:", err);
        }
      }

      // Local development fallback: look for firebase-service-account.json in root
      if (!serviceAccount) {
        const localKeyPath = path.resolve(process.cwd(), "firebase-service-account.json");
        if (fs.existsSync(localKeyPath)) {
          try {
            serviceAccount = JSON.parse(fs.readFileSync(localKeyPath, "utf8"));
          } catch (err) {
            console.warn("[TimeCapsule] Failed to read local service account file:", err);
          }
        }
      }

      if (serviceAccount && serviceAccount.project_id) {
        cachedApp = initializeApp({
          credential: cert(serviceAccount),
        });
      } else {
        cachedApp = initializeApp();
      }
    }
  }

  if (!cachedDb) {
    cachedDb = getFirestore(cachedApp);
  }

  return {
    app: cachedApp,
    db: cachedDb,
    firestore: () => cachedDb,
    FieldValue,
    Timestamp,
  };
}

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Supports 10 digits, +91, 91, 0 prefix, spaces and hyphens
export const INDIAN_PHONE_REGEX = /^(?:(?:\+|00)?91[\s-]?|0)?[6-9]\d{9}$/;

export const VALID_CURRENT_YEARS = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
];

export const REQUIRED_QUESTIONS = [
  { key: "aspiredRole", label: "What do you want to become?" },
  { key: "biggestDream", label: "What is your biggest dream right now?" },
  { key: "fourYearVision", label: "Where do you see yourself after 4 years?" },
  { key: "graduationGoals", label: "What do you want to achieve before graduation?" },
  { key: "currentFear", label: "What is your biggest fear right now?" },
  { key: "inspirationSource", label: "Who inspires you?" },
  { key: "personalPromise", label: "What is one promise you are making to yourself?" },
  { key: "memoryAnchor", label: "What do you want your future self to remember about today?" },
];

/**
 * Calculates the standardized unlock date:
 * June 15 of graduationYear at 00:00:00.000 UTC
 */
export function getDefaultUnlockDate(graduationYear) {
  const year = parseInt(graduationYear, 10);
  if (isNaN(year) || year < 2020 || year > 2100) {
    throw new Error("Invalid graduation year for unlock date calculation.");
  }
  return new Date(Date.UTC(year, 5, 15, 0, 0, 0, 0));
}

/**
 * Generates a 256-bit cryptographically secure token (64 hex chars).
 */
export function generateSecureToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Generates a SHA-256 hash of the given raw token.
 */
export function hashToken(rawToken) {
  if (!rawToken || typeof rawToken !== "string") {
    throw new Error("Cannot hash an invalid or empty token.");
  }
  return crypto.createHash("sha256").update(rawToken.trim()).digest("hex");
}

/**
 * Generates a human-friendly capsule reference code.
 * Example: CAP-2029-7X4K
 */
export function generateCapsuleCode(graduationYear = 2028) {
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `CAP-${graduationYear}-${rand}`;
}

/**
 * Strips HTML tags and trims leading/trailing whitespace.
 */
export function sanitizeText(input = "", maxLength = 1000) {
  if (typeof input !== "string") return "";
  /* eslint-disable no-control-regex */
  const cleaned = input
    .replace(/<[^>]*>/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim();
  /* eslint-enable no-control-regex */
  return cleaned.slice(0, maxLength);
}

/**
 * Normalizes an Indian phone number to 10 digits or E.164.
 */
export function normalizePhone(phone = "") {
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return `+91${digits.slice(1)}`;
  }
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  return phone.trim();
}

/**
 * Simple in-memory sliding-window rate limiter for serverless containers.
 */
const rateLimitMap = new Map();
const RATE_LIMIT_CLEANUP_INTERVAL = 60000;
let lastCleanup = Date.now();

export function checkRateLimit(ip = "anonymous", limit = 15, windowMs = 60000) {
  const now = Date.now();

  if (now - lastCleanup > RATE_LIMIT_CLEANUP_INTERVAL) {
    for (const [key, record] of rateLimitMap.entries()) {
      if (now - record.resetTime > 0) {
        rateLimitMap.delete(key);
      }
    }
    lastCleanup = now;
  }

  const record = rateLimitMap.get(ip) || { count: 0, resetTime: now + windowMs };
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
  } else {
    record.count += 1;
  }
  rateLimitMap.set(ip, record);

  return {
    allowed: record.count <= limit,
    remaining: Math.max(0, limit - record.count),
    resetInSeconds: Math.ceil((record.resetTime - now) / 1000),
  };
}

/**
 * Derives a 256-bit symmetric encryption key from environment secrets.
 */
function getEncryptionKey() {
  const secret =
    process.env.CAPSULE_ENCRYPTION_KEY ||
    process.env.CRON_SECRET ||
    process.env.FIREBASE_PRIVATE_KEY ||
    "abhyudaya-capsule-secure-fallback-key-2026";
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts a raw token with AES-256-GCM for secure database persistence.
 * Output format: `${ivHex}:${authTagHex}:${ciphertextHex}`
 *
 * @param {string} rawToken - 64-character hexadecimal raw secret token
 * @returns {string} - Encrypted string containing IV, AuthTag, and Ciphertext
 */
export function encryptToken(rawToken) {
  if (!rawToken || typeof rawToken !== "string") {
    throw new Error("Cannot encrypt empty token.");
  }
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // Standard 96-bit IV for AES-GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let ciphertext = cipher.update(rawToken, "utf8", "hex");
  ciphertext += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext}`;
}

/**
 * Decrypts an AES-256-GCM encrypted token.
 *
 * @param {string} encryptedString - Format: `${ivHex}:${authTagHex}:${ciphertextHex}`
 * @returns {string} - Decrypted raw secret token
 */
export function decryptToken(encryptedString) {
  if (!encryptedString || typeof encryptedString !== "string") {
    throw new Error("Cannot decrypt empty encrypted string.");
  }
  const parts = encryptedString.split(":");
  if (parts.length !== 3) {
    throw new Error("Malformed encrypted token payload.");
  }
  const [ivHex, authTagHex, ciphertextHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(ciphertextHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

