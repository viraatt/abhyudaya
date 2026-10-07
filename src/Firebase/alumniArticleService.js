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
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { generateUniqueSlug } from "../utils/slug";
import { publishBlog, updateBlogService } from "./blogService";
import { resolveAuthorName } from "../utils/authorHelper";

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
  DRAFT: "draft",
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
  const resolvedName = resolveAuthorName(data.author, data);
  const textValue = (value, depth = 0) => {
    if (depth > 3 || value == null) return "";
    if (typeof value === "string") return value.trim();
    if (typeof value === "number") return String(value);
    if (Array.isArray(value)) {
      return value.map((entry) => textValue(entry, depth + 1)).filter(Boolean).join(", ");
    }
    if (typeof value === "object") {
      for (const key of ["name", "displayName", "fullName", "label", "title", "value", "url"]) {
        const text = textValue(value[key], depth + 1);
        if (text) return text;
      }
    }
    return "";
  };
  const authorData = data.author && typeof data.author === "object" ? data.author : {};
  const author = data.author
    ? {
        ...authorData,
        name: resolvedName !== "Abhyudaya Alumni"
          ? resolvedName
          : textValue(authorData.name || data.author),
        branch: textValue(authorData.branch),
        graduationYear: textValue(authorData.graduationYear),
        organization: textValue(authorData.organization),
        designation: textValue(authorData.designation),
        linkedin: textValue(authorData.linkedin),
        profilePhoto: textValue(authorData.profilePhoto || authorData.photoURL),
        email: textValue(authorData.email),
      }
    : data.author;

  return {
    id: snap.id,
    ...data,
    author,
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

    authorUid: formData.authorUid || null,
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
  if (!existing.editToken || existing.editToken !== editToken) {
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
 * Save an alumni article as draft (create or update).
 * Used directly by the blog editor when role === 'alumni'.
 */
export async function saveAlumniArticleDraft(docId, formData, user) {
  const { author, title, category, excerpt, content, featuredImage, slug: customSlug, tags } = formData;
  const slug = customSlug ? customSlug.trim() : (title?.trim() ? await generateUniqueSlug(title) : "draft-" + Date.now());

  let existing = null;
  if (docId) {
    try {
      const existingSnap = await getDoc(doc(db, ALUMNI_SUBMISSIONS_COLLECTION, docId));
      if (existingSnap.exists()) {
        existing = existingSnap.data();
      }
    } catch (e) {
      console.warn("Could not read existing submission draft:", e);
    }
  }

  const authorUid = user?.uid || formData.authorUid || formData.authorId || existing?.authorUid || existing?.authorId || null;
  const resolvedName = resolveAuthorName(author, existing?.author, existing, user);

  const authorData = {
    uid: authorUid,
    name: resolvedName !== "Abhyudaya Alumni" ? resolvedName : (author?.name || existing?.author?.name || user?.name || "").trim(),
    graduationYear: String(author?.graduationYear || existing?.author?.graduationYear || user?.graduationYear || "").trim(),
    branch: (author?.branch || existing?.author?.branch || user?.branch || "").trim(),
    organization: (author?.organization || existing?.author?.organization || user?.organization || "").trim(),
    designation: (author?.designation || existing?.author?.designation || user?.designation || "").trim(),
    linkedin: (author?.linkedin || existing?.author?.linkedin || user?.linkedin || "").trim(),
    email: (author?.email || existing?.author?.email || user?.email || "").trim().toLowerCase(),
    profilePhoto: author?.profilePhoto || existing?.author?.profilePhoto || user?.profilePhoto || user?.photoURL || "",
  };

  const payload = {
    title: (title || existing?.title || "Untitled Draft").trim(),
    slug,
    category: (category || existing?.category || "Alumni Stories").trim(),
    excerpt: (excerpt || existing?.excerpt || "").trim(),
    content: content || existing?.content || "",
    featuredImage: featuredImage !== undefined ? featuredImage : (existing?.featuredImage || ""),
    tags: Array.isArray(tags) ? tags : (existing?.tags || []),
    author: authorData,
    alumniAuthor: authorData,
    authorUid: authorUid,
    authorId: authorUid,
    authorEmail: formData.authorEmail || user?.email || existing?.authorEmail || "",
    authorProfilePhoto: formData.authorProfilePhoto || user?.profilePhoto || existing?.authorProfilePhoto || "",
    status: SUBMISSION_STATUSES.DRAFT,
    isAlumniContribution: true,
    updatedAt: serverTimestamp(),
  };

  if (docId) {
    const ref = doc(db, ALUMNI_SUBMISSIONS_COLLECTION, docId);
    await updateDoc(ref, payload);
    return { id: docId, slug };
  } else {
    payload.submittedAt = serverTimestamp();
    payload.adminFeedback = null;
    payload.rejectionReason = null;
    payload.editToken = generateEditToken();
    payload.publishedBlogId = null;
    const docRef = await addDoc(alumniRef, payload);
    return { id: docRef.id, slug, editToken: payload.editToken };
  }
}

/**
 * Submit an alumni article for approval (create or update).
 * Validates requirements and sets status to SUBMISSION_STATUSES.PENDING.
 */
export async function submitAlumniArticleForApproval(docId, formData, user) {
  const { author, title, category, excerpt, content, featuredImage, slug: customSlug, tags } = formData;

  if (!title?.trim()) throw new Error("Article title is required.");
  if (!content) throw new Error("Article content is required.");

  const slug = customSlug ? customSlug.trim() : await generateUniqueSlug(title);

  let existing = null;
  if (docId) {
    try {
      const existingSnap = await getDoc(doc(db, ALUMNI_SUBMISSIONS_COLLECTION, docId));
      if (existingSnap.exists()) {
        existing = existingSnap.data();
      }
    } catch (e) {
      console.warn("Could not read existing submission for approval:", e);
    }
  }

  const authorUid = user?.uid || formData.authorUid || formData.authorId || existing?.authorUid || existing?.authorId || null;
  const resolvedName = resolveAuthorName(author, existing?.author, existing, user);

  const authorData = {
    uid: authorUid,
    name: resolvedName !== "Abhyudaya Alumni" ? resolvedName : (author?.name || existing?.author?.name || user?.name || "").trim(),
    graduationYear: String(author?.graduationYear || existing?.author?.graduationYear || user?.graduationYear || "").trim(),
    branch: (author?.branch || existing?.author?.branch || user?.branch || "").trim(),
    organization: (author?.organization || existing?.author?.organization || user?.organization || "").trim(),
    designation: (author?.designation || existing?.author?.designation || user?.designation || "").trim(),
    linkedin: (author?.linkedin || existing?.author?.linkedin || user?.linkedin || "").trim(),
    email: (author?.email || existing?.author?.email || user?.email || "").trim().toLowerCase(),
    profilePhoto: author?.profilePhoto || existing?.author?.profilePhoto || user?.profilePhoto || user?.photoURL || "",
  };

  const payload = {
    title: title.trim(),
    slug,
    category: (category || existing?.category || "Alumni Stories").trim(),
    excerpt: (excerpt || existing?.excerpt || "").trim(),
    content: content || "",
    featuredImage: featuredImage !== undefined ? featuredImage : (existing?.featuredImage || ""),
    tags: Array.isArray(tags) ? tags : (existing?.tags || []),
    author: authorData,
    alumniAuthor: authorData,
    authorUid: authorUid,
    authorId: authorUid,
    authorEmail: formData.authorEmail || user?.email || existing?.authorEmail || "",
    authorProfilePhoto: formData.authorProfilePhoto || user?.profilePhoto || existing?.authorProfilePhoto || "",
    status: SUBMISSION_STATUSES.PENDING,
    isAlumniContribution: true,
    updatedAt: serverTimestamp(),
  };

  if (docId) {
    const ref = doc(db, ALUMNI_SUBMISSIONS_COLLECTION, docId);
    await updateDoc(ref, payload);
    return { id: docId, slug, status: SUBMISSION_STATUSES.PENDING };
  } else {
    payload.submittedAt = serverTimestamp();
    payload.adminFeedback = null;
    payload.rejectionReason = null;
    payload.editToken = generateEditToken();
    payload.publishedBlogId = null;
    const docRef = await addDoc(alumniRef, payload);
    return { id: docRef.id, slug, status: SUBMISSION_STATUSES.PENDING };
  }
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
 * Fetch all alumni submissions authored by a specific logged-in alumni user.
 */
/**
 * Fetch all alumni submissions authored by a specific logged-in alumni user.
 */
export async function getAlumniSubmissionsByAuthor(authorUid) {
  if (!authorUid) return [];
  try {
    const docsMap = new Map();

    // Query 1: by authorUid
    try {
      const q1 = query(alumniRef, where("authorUid", "==", authorUid));
      const snap1 = await getDocs(q1);
      snap1.docs.forEach((d) => docsMap.set(d.id, formatSubmissionDoc(d)));
    } catch (err1) {
      console.warn("Author query by authorUid failed, trying secondary:", err1);
    }

    // Query 2: by authorId (fallback for any older records)
    try {
      const q2 = query(alumniRef, where("authorId", "==", authorUid));
      const snap2 = await getDocs(q2);
      snap2.docs.forEach((d) => {
        if (!docsMap.has(d.id)) {
          docsMap.set(d.id, formatSubmissionDoc(d));
        }
      });
    } catch (err2) {
      console.warn("Author query by authorId failed:", err2);
    }

    const items = Array.from(docsMap.values());
    return items.sort((a, b) => {
      const timeA = a.submittedAt?.seconds || a.updatedAt?.seconds || 0;
      const timeB = b.submittedAt?.seconds || b.updatedAt?.seconds || 0;
      return timeB - timeA;
    });
  } catch (err) {
    console.error("Error fetching author submissions:", err);
    return [];
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
 * CRITICAL FIX: Approving an article immediately publishes it to the main `blogs` collection,
 * updates the public blog, and updates the submission document with published status and blog ID.
 * Author privacy is strictly preserved: author email is NEVER copied to the public blog collection.
 */
export async function approveAlumniArticle(id, reviewer) {
  const submissionRef = doc(db, ALUMNI_SUBMISSIONS_COLLECTION, id);
  const snap = await getDoc(submissionRef);

  if (!snap.exists()) {
    throw new Error("Article submission not found.");
  }

  const submission = snap.data();
  const reviewerInfo = {
    uid: reviewer?.uid || null,
    name: reviewer?.name || reviewer?.email || "Admin",
    email: reviewer?.email || "",
    role: reviewer?.role || "admin",
  };

  // Attempt to load author's Firestore user document if authorUid exists
  let authorProfileFromUsers = null;
  const authorUid =
    submission.authorUid ||
    submission.authorId ||
    submission.uid ||
    submission.userId ||
    submission.createdBy ||
    submission.author?.uid ||
    submission.author?.id;

  if (authorUid) {
    try {
      const uSnap = await getDoc(doc(db, "users", authorUid));
      if (uSnap.exists()) {
        authorProfileFromUsers = uSnap.data();
      }
    } catch (e) {
      console.warn("Could not fetch author profile from users collection during approval:", e);
    }
  }

  // Resolve author name using submission.author, submission, and authorProfileFromUsers
  const resolvedName = resolveAuthorName(
    submission.author,
    submission,
    authorProfileFromUsers
  );

  // Build clean, sanitized alumni author object (NO email!)
  const safeAlumniAuthor = {
    name: resolvedName,
    graduationYear: (
      submission.author?.graduationYear ||
      submission.graduationYear ||
      authorProfileFromUsers?.graduationYear ||
      ""
    ).toString().trim(),
    branch: (
      submission.author?.branch ||
      submission.branch ||
      authorProfileFromUsers?.branch ||
      authorProfileFromUsers?.department ||
      ""
    ).trim(),
    organization: (
      submission.author?.organization ||
      submission.organization ||
      authorProfileFromUsers?.organization ||
      ""
    ).trim(),
    designation: (
      submission.author?.designation ||
      submission.designation ||
      authorProfileFromUsers?.designation ||
      ""
    ).trim(),
    linkedin: (
      submission.author?.linkedin ||
      submission.linkedin ||
      authorProfileFromUsers?.linkedin ||
      ""
    ).trim(),
    profilePhoto:
      submission.author?.profilePhoto ||
      submission.profilePhoto ||
      authorProfileFromUsers?.profilePhoto ||
      authorProfileFromUsers?.photoURL ||
      "",
  };

  const finalSlug = submission.slug || (await generateUniqueSlug(submission.title));

  // Prepare blog payload for public blogs collection
  const blogPayload = {
    title: (submission.title || "").trim(),
    slug: finalSlug,
    category: submission.category || "Alumni Stories",
    featuredImage: submission.featuredImage || "",
    excerpt: (submission.excerpt || "").trim(),
    content: submission.content || "",
    status: "Published",
    author: resolvedName,
    isAlumniContribution: true,
    alumniAuthor: safeAlumniAuthor,
    authorUid: authorUid || null,
    authorId: authorUid || null,
    submissionId: id,
    tags:
      Array.isArray(submission.tags) && submission.tags.length > 0
        ? submission.tags
        : [submission.category || "Alumni Stories"].filter(Boolean),
  };

  let publishedBlogId = submission.publishedBlogId;

  if (publishedBlogId) {
    try {
      const blogDocRef = doc(db, "blogs", publishedBlogId);
      const blogSnap = await getDoc(blogDocRef);
      if (blogSnap.exists()) {
        await updateBlogService(publishedBlogId, blogPayload);
      } else {
        const created = await publishBlog(blogPayload);
        publishedBlogId = created.id;
      }
    } catch {
      const created = await publishBlog(blogPayload);
      publishedBlogId = created.id;
    }
  } else {
    const created = await publishBlog(blogPayload);
    publishedBlogId = created.id;
  }

  // Update submission status to published & approved
  const submissionUpdate = {
    status: SUBMISSION_STATUSES.PUBLISHED,
    publishedBlogId,
    reviewedAt: serverTimestamp(),
    reviewedBy: reviewerInfo,
    publishedAt: serverTimestamp(),
    adminFeedback: null,
    rejectionReason: null,
    updatedAt: serverTimestamp(),
  };

  if (resolvedName && resolvedName !== "Abhyudaya Alumni") {
    submissionUpdate["author.name"] = resolvedName;
  }

  await updateDoc(submissionRef, submissionUpdate);

  return {
    id,
    blogId: publishedBlogId,
    slug: finalSlug,
    status: SUBMISSION_STATUSES.PUBLISHED,
  };
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
 * Calls approveAlumniArticle for unified, canonical behavior.
 */
export async function publishAlumniArticleToBlog(submissionId, publisher) {
  return await approveAlumniArticle(submissionId, publisher);
}

/**
 * Admin action: Delete an alumni submission.
 */
export async function deleteAlumniSubmission(id) {
  const ref = doc(db, ALUMNI_SUBMISSIONS_COLLECTION, id);
  await deleteDoc(ref);
  return { id };
}
