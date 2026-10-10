import { auth, db } from "./firebase";
import {
  collection,
  addDoc,
  doc,
  getDocs,
  updateDoc,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
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

  const linkedBlog = existing
    ? await resolveLinkedAlumniBlog(docId, existing)
    : null;
  if (existing?.status === SUBMISSION_STATUSES.PUBLISHED && !linkedBlog) {
    throw new Error("Cannot edit published alumni article: linked blog document could not be resolved.");
  }
  const hasLinkedBlog = Boolean(linkedBlog);
  const keepPublished = existing?.status === SUBMISSION_STATUSES.PUBLISHED && hasLinkedBlog;
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
    status: keepPublished ? SUBMISSION_STATUSES.PUBLISHED : SUBMISSION_STATUSES.DRAFT,
    isAlumniContribution: true,
    updatedAt: serverTimestamp(),
  };
  if (linkedBlog) payload.publishedBlogId = linkedBlog.blogId;

  if (docId) {
    const ref = doc(db, ALUMNI_SUBMISSIONS_COLLECTION, docId);
    await updateDoc(ref, payload);
    if (hasLinkedBlog) {
      await updateBlogService(linkedBlog.blogId, {
        ...payload,
        status: keepPublished ? "Published" : "Draft",
        isAlumniContribution: true,
        author: authorData.name,
        authorUid,
        authorId: authorUid,
        submissionId: docId,
        alumniAuthor: authorData,
      });
    }
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
      console.warn("[alumniArticleService] authorUid query failed; trying legacy authorId query", {
        errorCode: err1?.code || "unknown",
        errorMessage: err1?.message || String(err1),
        articleId: null,
        submissionId: null,
        blogId: null,
        currentUserUid: authorUid,
        currentUserRole: "alumni",
        collection: ALUMNI_SUBMISSIONS_COLLECTION,
        queryField: "authorUid",
      });
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
      console.warn("[alumniArticleService] authorId query failed", {
        errorCode: err2?.code || "unknown",
        errorMessage: err2?.message || String(err2),
        articleId: null,
        submissionId: null,
        blogId: null,
        currentUserUid: authorUid,
        currentUserRole: "alumni",
        collection: ALUMNI_SUBMISSIONS_COLLECTION,
        queryField: "authorId",
      });
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

  const existingLinkedBlog = await resolveLinkedAlumniBlog(id, submission);
  const publishBatch = writeBatch(db);
  let publishedBlogId;
  let publishedSlug;

  if (existingLinkedBlog) {
    publishedBlogId = existingLinkedBlog.blogId;
    const updated = await updateBlogService(publishedBlogId, blogPayload, { batch: publishBatch });
    publishedSlug = updated.slug;
  } else {
    const newBlogRef = doc(blogCollection);
    const created = await publishBlog(blogPayload, {
      batch: publishBatch,
      documentId: newBlogRef.id,
    });
    publishedBlogId = created.id;
    publishedSlug = created.slug;
  }

  // Update submission status to published & approved
  const submissionUpdate = {
    status: SUBMISSION_STATUSES.PUBLISHED,
    publishedBlogId,
    linkedBlogId: publishedBlogId,
    slug: publishedSlug,
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

  publishBatch.update(submissionRef, submissionUpdate);
  await publishBatch.commit();

  if (!existingLinkedBlog) {
    console.log("[alumniArticleService] PUBLISH BLOG CREATED", {
      submissionId: id,
      publishedBlogId,
    });
  }
  console.log("[alumniArticleService] LINKED BLOG ID SAVED", {
    submissionId: id,
    linkedBlogId: publishedBlogId,
  });

  return {
    id,
    blogId: publishedBlogId,
    linkedBlogId: publishedBlogId,
    slug: publishedSlug,
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
export async function deleteAlumniSubmission(id, actor = null, publishedBlogId = null) {
  const ref = doc(db, ALUMNI_SUBMISSIONS_COLLECTION, id);
  let linkedBlogId = null;
  let resolvedBlogId = null;
  let operation = "submission read";
  let documentPath = `${ALUMNI_SUBMISSIONS_COLLECTION}/${id}`;
  const logContext = () => ({
    articleId: id,
    submissionId: id,
    linkedBlogId,
    resolvedBlogId,
    uid: auth.currentUser?.uid || null,
    role: actor?.role || null,
  });

  console.log("[alumniArticleService] DELETE BEGIN", {
    articleId: id,
    submissionId: id,
    uid: auth.currentUser?.uid || null,
    role: actor?.role || null,
  });
  try {
    operation = "submission read";
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error("Article submission not found.");
    const submission = snap.data();
    const isOwner = actor?.role === "alumni"
      && auth.currentUser?.uid
      && (submission.authorUid === auth.currentUser.uid || submission.authorId === auth.currentUser.uid);
    if (actor?.role === "alumni" && !isOwner) {
      throw new Error("You are not authorized to delete this article.");
    }

    linkedBlogId = referenceId(submission.linkedBlogId)
      || referenceId(submission.publishedBlogId)
      || referenceId(publishedBlogId);
    console.log("[alumniArticleService] DELETE START", {
      articleId: id,
      submissionId: id,
      linkedBlogId,
      uid: auth.currentUser?.uid || null,
      role: actor?.role || null,
    });

    operation = "linked blog resolution";
    let resolved = null;
    try {
      resolved = await resolveLinkedAlumniBlog(
        id,
        submission,
        publishedBlogId ? [publishedBlogId] : [],
      );
    } catch (resolutionError) {
      console.warn("[alumniArticleService] linked blog could not be safely resolved; deleting the owned submission only", {
        submissionId: id,
        linkedBlogId,
        errorCode: resolutionError?.code || "unknown",
        errorMessage: resolutionError?.message || String(resolutionError),
      });
    }
    resolvedBlogId = resolved?.blogId || null;
    console.log("[alumniArticleService] LINKED BLOG RESOLUTION", {
      submissionId: id,
      linkedBlogId,
      resolvedBlogId,
    });
    if (!resolvedBlogId) {
      console.warn("[alumniArticleService] no linked blog document found; deleting the owned alumni submission only", {
        submissionId: id,
        linkedBlogId,
      });
    }

    const batch = writeBatch(db);
    if (resolvedBlogId) {
      documentPath = `blogs/${resolvedBlogId}`;
      operation = "linked blog verification";
      const blogRef = doc(db, "blogs", resolvedBlogId);
      if (!resolved || resolved.blog.isAlumniContribution !== true) {
        throw new Error("The linked blog does not belong to this alumni submission.");
      }
      console.log("[alumniArticleService] deleting linked blog", { ...logContext(), documentPath });
      batch.delete(blogRef);
    }

    operation = resolvedBlogId
      ? "batch commit (submission delete and linked blog delete)"
      : "submission-only batch commit (no linked blog resolved)";
    documentPath = resolvedBlogId
      ? `${ALUMNI_SUBMISSIONS_COLLECTION}/${id}, blogs/${resolvedBlogId}`
      : `${ALUMNI_SUBMISSIONS_COLLECTION}/${id}`;
    console.log("[alumniArticleService] deleting alumni submission", { ...logContext(), documentPath });
    batch.delete(ref);
    console.log("[alumniArticleService] committing delete batch", { ...logContext(), documentPath });
    await batch.commit();
    console.log("[alumniArticleService] DELETE SUCCESS", logContext());
    return { id, blogId: resolvedBlogId, linkedBlogId: resolvedBlogId, blogDeleted: Boolean(resolvedBlogId) };
  } catch (error) {
    console.error("[alumniArticleService] DELETE FAILED", {
      code: error?.code,
      message: error?.message,
      name: error?.name,
      ...logContext(),
      operation,
      document: documentPath,
    }, error);
    throw error;
  }
}

const blogCollection = collection(db, "blogs");
const submissionBlogReferenceFields = [
  "linkedBlogId",
  "publishedBlogId",
  "blogId",
  "linkedBlogId",
  "publishedPostId",
];
const blogSubmissionReferenceFields = [
  "submissionId",
  "alumniSubmissionId",
  "articleId",
];

function referenceId(value) {
  if (typeof value === "string") return value.trim() || null;
  if (value && typeof value.path === "string") return value.id || value.path.split("/").pop();
  return null;
}

/** Resolve a linked blog only when the document carries a verifiable alumni link. */
async function resolveLinkedAlumniBlog(submissionId, submission, additionalBlogIds = []) {
  const ownerUid = submission.authorUid || submission.authorId || submission.author?.uid || null;
  const referencedIds = new Set(
    submissionBlogReferenceFields
      .map((field) => referenceId(submission[field]))
      .concat(additionalBlogIds.map(referenceId))
      .filter(Boolean),
  );
  const candidates = new Map();

  for (const blogId of referencedIds) {
    try {
      const snap = await getDoc(doc(db, "blogs", blogId));
      if (snap.exists()) candidates.set(snap.id, snap.data());
    } catch (error) {
      // A stale reference may point at a deleted document; continue to the
      // reciprocal-reference and slug lookups before declaring it unresolved.
      if (error?.code !== "permission-denied" && error?.code !== "not-found") throw error;
    }
  }

  for (const field of blogSubmissionReferenceFields) {
    const matches = await getDocs(query(
      blogCollection,
      where("status", "==", "Published"),
      where(field, "==", submissionId),
    ));
    matches.docs.forEach((snap) => candidates.set(snap.id, snap.data()));
  }

  if (submission.slug) {
    const matches = await getDocs(query(
      blogCollection,
      where("status", "==", "Published"),
      where("slug", "==", submission.slug),
    ));
    matches.docs.forEach((snap) => candidates.set(snap.id, snap.data()));
  }

  const validCandidates = [];
  for (const [blogId, blog] of candidates) {
    if (blog.isAlumniContribution !== true) continue;
    const hasBackReference = blogSubmissionReferenceFields.some(
      (field) => blog[field] === submissionId,
    );
    const blogOwnerUid = blog.authorUid || blog.authorId || blog.alumniAuthor?.uid || null;
    const ownerAndSlugMatch = Boolean(
      ownerUid && blogOwnerUid === ownerUid && submission.slug && blog.slug === submission.slug,
    );
    const storedReferenceMatches = referencedIds.has(blogId) && (!ownerUid || blogOwnerUid === ownerUid);
    if (hasBackReference || ownerAndSlugMatch || storedReferenceMatches) {
      validCandidates.push({ blogId, blog });
    }
  }

  if (validCandidates.length > 1) {
    throw new Error(`Multiple published blogs match alumni submission ${submissionId}; refusing an ambiguous operation.`);
  }
  return validCandidates[0] || null;
}

/** Keep the private submission record in sync when Super Admin edits its linked blog. */
export async function syncAlumniSubmissionFromBlog(submissionId, blogId, blogData, actor) {
  if (actor?.role !== "super_admin") {
    throw new Error("Only Super Admin can sync a published alumni article.");
  }
  const ref = doc(db, ALUMNI_SUBMISSIONS_COLLECTION, submissionId);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error("Article submission not found.");
    const submission = snap.data();
    const linked = await resolveLinkedAlumniBlog(submissionId, submission, [blogId]);
    if (!linked || linked.blogId !== blogId) {
      throw new Error("The blog is not linked to this alumni submission.");
    }
    const payload = {
      title: blogData.title || "",
      slug: blogData.slug || "",
      category: blogData.category || "Alumni Stories",
      excerpt: blogData.excerpt || "",
      content: blogData.content || "",
      featuredImage: blogData.featuredImage || "",
      tags: Array.isArray(blogData.tags) ? blogData.tags : [],
      updatedAt: serverTimestamp(),
    };
    if (blogData.status === "Published") {
      payload.status = SUBMISSION_STATUSES.PUBLISHED;
      if (submission.status !== SUBMISSION_STATUSES.PUBLISHED) {
        payload.publishedAt = serverTimestamp();
      }
    } else if (submission.status === SUBMISSION_STATUSES.PUBLISHED && blogData.status === "Draft") {
      payload.status = SUBMISSION_STATUSES.APPROVED;
    }
    payload.publishedBlogId = blogId;
    payload.linkedBlogId = blogId;
    await updateDoc(ref, payload);
    return { id: submissionId, blogId };
  } catch (error) {
    console.error("[alumniArticleService] admin sync failed", {
      errorCode: error?.code || "unknown",
      errorMessage: error?.message || String(error),
      articleId: submissionId,
      blogId,
      collections: [ALUMNI_SUBMISSIONS_COLLECTION],
      currentUserUid: actor?.uid || null,
      currentUserRole: actor?.role || null,
    });
    throw error;
  }
}

/** Unpublish an author's live article while keeping its linked record for republishing. */
export async function unpublishAlumniArticle(id, actor = null) {
  const submissionRef = doc(db, ALUMNI_SUBMISSIONS_COLLECTION, id);
  let blogId = null;
  try {
    const snap = await getDoc(submissionRef);
    if (!snap.exists()) throw new Error("Article submission not found.");
    const submission = snap.data();
    const isSuperAdmin = actor?.role === "super_admin";
    const isOwner = actor?.role === "alumni"
      && actor?.uid
      && (submission.authorUid === actor.uid || submission.authorId === actor.uid);
    if (!isSuperAdmin && !isOwner) {
      throw new Error("You are not authorized to unpublish this article.");
    }
    if (submission.status !== SUBMISSION_STATUSES.PUBLISHED) {
      throw new Error("Published blog not found.");
    }
    const resolved = await resolveLinkedAlumniBlog(id, submission);
    blogId = resolved?.blogId || null;
    console.log("[alumniArticleService] resolved linked blog", { submissionId: id, blogId });
    if (!blogId) {
      throw new Error("Cannot unpublish alumni article: linked blog document could not be resolved.");
    }
    const blogRef = doc(db, "blogs", blogId);
    const blog = resolved.blog;
    if (blog.isAlumniContribution !== true) {
      throw new Error("The published blog is not linked to this alumni submission.");
    }
    console.log("[alumniArticleService] unpublishing linked blog", { submissionId: id, blogId });
    const batch = writeBatch(db);
    batch.update(blogRef, {
      status: "Draft",
      updatedAt: serverTimestamp(),
    });
    batch.update(submissionRef, {
      status: SUBMISSION_STATUSES.APPROVED,
      publishedBlogId: blogId,
      updatedAt: serverTimestamp(),
    });
    console.log("[alumniArticleService] committing unpublish batch", { submissionId: id, blogId });
    await batch.commit();
    return { id, blogId };
  } catch (error) {
    console.error("[alumniArticleService] unpublish failed", {
      errorCode: error?.code || "unknown",
      errorMessage: error?.message || String(error),
      articleId: id,
      submissionId: id,
      blogId,
      collections: [ALUMNI_SUBMISSIONS_COLLECTION, "blogs"],
      currentUserUid: actor?.uid || null,
      currentUserRole: actor?.role || null,
    });
    throw error;
  }
}
