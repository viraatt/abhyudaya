import { db } from "./firebase";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { generateUniqueSlug } from "../utils/slug";
import { publishBlog, updateBlogService } from "./blogService";

const ALUMNI_SUBMISSIONS_COLLECTION = "alumniSubmissions";
const alumniRef = collection(db, ALUMNI_SUBMISSIONS_COLLECTION);

export const ALUMNI_CATEGORIES = [
  "Alumni Stories",
  "Career Journey",
  "Industry Insights",
  "Higher Studies",
  "Entrepreneurship",
  "Technology",
  "College Memories",
  "Placement & Career Advice",
  "Life at MPEC",
  "Other",
];

export const SUBMISSION_STATUSES = {
  PENDING: "pending",
  CHANGES_REQUESTED: "changes_requested",
  RESUBMITTED: "resubmitted",
  APPROVED: "approved",
  REJECTED: "rejected",
  PUBLISHED: "published",
};

/**
 * Generates a random secure edit token for guest alumni to track & resubmit their article.
 */
function generateEditToken() {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

/**
 * Format a submission document with safe dates and fallbacks.
 */
function formatSubmissionDoc(snap) {
  const data = snap.data();
  return {
    id: snap.id,
    ...data,
    submittedDateFormatted: data.submittedAt?.toDate
      ? data.submittedAt.toDate().toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "Recently",
    reviewedDateFormatted: data.reviewedAt?.toDate
      ? data.reviewedAt.toDate().toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : null,
  };
}

/**
 * Submit a new alumni article from the public submission form.
 */
export async function submitAlumniArticle(formData) {
  const { author, title, category, excerpt, content, featuredImage } = formData;

  if (!author?.name?.trim()) throw new Error("Author full name is required.");
  if (!author?.graduationYear) throw new Error("Graduation year is required.");
  if (!author?.branch?.trim()) throw new Error("Branch is required.");
  if (!title?.trim()) throw new Error("Article title is required.");
  if (!category?.trim()) throw new Error("Category is required.");
  if (!excerpt?.trim()) throw new Error("Short description / excerpt is required.");
  if (!content?.trim()) throw new Error("Article content is required.");

  const slug = await generateUniqueSlug(title);
  const editToken = generateEditToken();

  const payload = {
    title: title.trim(),
    slug,
    category: category.trim(),
    excerpt: excerpt.trim(),
    content: content.trim(),
    featuredImage: featuredImage || "",

    author: {
      name: author.name.trim(),
      graduationYear: String(author.graduationYear).trim(),
      branch: author.branch.trim(),
      organization: (author.organization || "").trim(),
      designation: (author.designation || "").trim(),
      linkedin: (author.linkedin || "").trim(),
      email: (author.email || "").trim().toLowerCase(),
      profilePhoto: author.profilePhoto || "",
    },

    status: SUBMISSION_STATUSES.PENDING,
    isAlumniContribution: true,

    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    reviewedAt: null,
    reviewedBy: null,

    adminFeedback: null,
    rejectionReason: null,

    editToken,
    publishedBlogId: null,
  };

  const docRef = await addDoc(alumniRef, payload);
  return { id: docRef.id, slug, editToken };
}

/**
 * Resubmit an existing article after changes were requested by admin.
 */
export async function resubmitAlumniArticle(id, editToken, formData) {
  const ref = doc(db, ALUMNI_SUBMISSIONS_COLLECTION, id);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error("Article submission not found.");
  }

  const existing = snap.data();
  if (existing.editToken && existing.editToken !== editToken) {
    throw new Error("Invalid authorization token for this submission.");
  }

  const { author, title, category, excerpt, content, featuredImage } = formData;

  const payload = {
    title: (title || existing.title).trim(),
    category: (category || existing.category).trim(),
    excerpt: (excerpt || existing.excerpt).trim(),
    content: (content || existing.content).trim(),
    featuredImage: featuredImage !== undefined ? featuredImage : existing.featuredImage,

    author: {
      ...existing.author,
      ...(author ? {
        name: author.name ? author.name.trim() : existing.author.name,
        graduationYear: author.graduationYear ? String(author.graduationYear).trim() : existing.author.graduationYear,
        branch: author.branch ? author.branch.trim() : existing.author.branch,
        organization: author.organization !== undefined ? author.organization.trim() : existing.author.organization,
        designation: author.designation !== undefined ? author.designation.trim() : existing.author.designation,
        linkedin: author.linkedin !== undefined ? author.linkedin.trim() : existing.author.linkedin,
        email: author.email ? author.email.trim().toLowerCase() : existing.author.email,
        profilePhoto: author.profilePhoto !== undefined ? author.profilePhoto : existing.author.profilePhoto,
      } : {}),
    },

    status: SUBMISSION_STATUSES.RESUBMITTED,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(ref, payload);
  return { id, status: SUBMISSION_STATUSES.RESUBMITTED };
}

/**
 * Fetch all alumni submissions for the admin dashboard.
 */
export async function getAlumniSubmissions() {
  try {
    const q = query(alumniRef, orderBy("submittedAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(formatSubmissionDoc);
  } catch (err) {
    console.error("Error fetching alumni submissions:", err);
    // Fallback if index on submittedAt isn't built yet
    const snapshot = await getDocs(alumniRef);
    return snapshot.docs.map(formatSubmissionDoc);
  }
}

/**
 * Fetch single submission by ID.
 */
export async function getAlumniSubmissionById(id) {
  const ref = doc(db, ALUMNI_SUBMISSIONS_COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return formatSubmissionDoc(snap);
}

/**
 * Admin action: Approve an alumni article.
 */
export async function approveAlumniArticle(id, reviewer) {
  const ref = doc(db, ALUMNI_SUBMISSIONS_COLLECTION, id);
  const payload = {
    status: SUBMISSION_STATUSES.APPROVED,
    reviewedAt: serverTimestamp(),
    reviewedBy: {
      uid: reviewer?.uid || null,
      name: reviewer?.name || reviewer?.email || "Admin",
      email: reviewer?.email || "",
      role: reviewer?.role || "admin",
    },
    adminFeedback: null,
    rejectionReason: null,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(ref, payload);
  return { id, status: SUBMISSION_STATUSES.APPROVED };
}

/**
 * Admin action: Request changes with specific feedback.
 */
export async function requestChangesAlumniArticle(id, reviewer, feedback) {
  if (!feedback || !feedback.trim()) {
    throw new Error("Feedback message is required when requesting changes.");
  }

  const ref = doc(db, ALUMNI_SUBMISSIONS_COLLECTION, id);
  const payload = {
    status: SUBMISSION_STATUSES.CHANGES_REQUESTED,
    adminFeedback: feedback.trim(),
    reviewedAt: serverTimestamp(),
    reviewedBy: {
      uid: reviewer?.uid || null,
      name: reviewer?.name || reviewer?.email || "Admin",
      email: reviewer?.email || "",
      role: reviewer?.role || "admin",
    },
    updatedAt: serverTimestamp(),
  };

  await updateDoc(ref, payload);
  return { id, status: SUBMISSION_STATUSES.CHANGES_REQUESTED };
}

/**
 * Admin action: Reject an article with a reason.
 */
export async function rejectAlumniArticle(id, reviewer, reason) {
  if (!reason || !reason.trim()) {
    throw new Error("Rejection reason is required.");
  }

  const ref = doc(db, ALUMNI_SUBMISSIONS_COLLECTION, id);
  const payload = {
    status: SUBMISSION_STATUSES.REJECTED,
    rejectionReason: reason.trim(),
    reviewedAt: serverTimestamp(),
    reviewedBy: {
      uid: reviewer?.uid || null,
      name: reviewer?.name || reviewer?.email || "Admin",
      email: reviewer?.email || "",
      role: reviewer?.role || "admin",
    },
    updatedAt: serverTimestamp(),
  };

  await updateDoc(ref, payload);
  return { id, status: SUBMISSION_STATUSES.REJECTED };
}

/**
 * Admin action: Publish an approved article to the main `blogs` collection.
 * CRITICAL: The alumni author is preserved and NEVER replaced with 'Admin'.
 */
export async function publishAlumniArticleToBlog(submissionId, publisher) {
  const submissionRef = doc(db, ALUMNI_SUBMISSIONS_COLLECTION, submissionId);
  const snap = await getDoc(submissionRef);

  if (!snap.exists()) {
    throw new Error("Submission not found.");
  }

  const submission = snap.data();
  const publisherInfo = {
    uid: publisher?.uid || null,
    name: publisher?.name || publisher?.email || "Admin",
    email: publisher?.email || "",
  };

  // Prepare blog payload for main blogs collection
  const blogPayload = {
    title: submission.title,
    slug: submission.slug,
    category: submission.category || "Alumni Stories",
    featuredImage: submission.featuredImage || "",
    excerpt: submission.excerpt || "",
    content: submission.content || "",
    status: "Published",
    // IMPORTANT: The author is the real alumni, never "Admin"!
    author: submission.author.name,
    isAlumniContribution: true,
    alumniAuthor: submission.author,
    reviewedBy: submission.reviewedBy || publisherInfo,
    publishedBy: publisherInfo,
    submissionId: submissionId,
    tags: ["Alumni Contribution", submission.category].filter(Boolean),
  };

  let publishedBlogId = submission.publishedBlogId;

  if (publishedBlogId) {
    // Update existing published blog
    await updateBlogService(publishedBlogId, blogPayload);
  } else {
    // Create new published blog
    const created = await publishBlog(blogPayload);
    publishedBlogId = created.id;
  }

  // Mark submission as published
  await updateDoc(submissionRef, {
    status: SUBMISSION_STATUSES.PUBLISHED,
    publishedBlogId,
    publishedAt: serverTimestamp(),
    publishedBy: publisherInfo,
    updatedAt: serverTimestamp(),
  });

  return {
    submissionId,
    blogId: publishedBlogId,
    slug: submission.slug,
    status: SUBMISSION_STATUSES.PUBLISHED,
  };
}

/**
 * Admin action: Delete an alumni submission.
 */
export async function deleteAlumniSubmission(id) {
  const ref = doc(db, ALUMNI_SUBMISSIONS_COLLECTION, id);
  await deleteDoc(ref);
  return { id };
}
