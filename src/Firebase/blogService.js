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
  limit,
  startAfter,
  serverTimestamp,
} from "firebase/firestore";
import { generateUniqueSlug, normalizeRouteSlug } from "../utils/slug";
import { blogs as staticBlogs } from "../data/blogs";
import { resolveAuthorName } from "../utils/authorHelper";

const BLOGS_COLLECTION = "blogs";
const blogsRef = collection(db, BLOGS_COLLECTION);

export function sanitizeAlumniAuthor(author) {
  if (!author || typeof author !== "object") return null;
  const resolved = resolveAuthorName(author);
  return {
    name: resolved !== "Abhyudaya Alumni" ? resolved : (author.name || author.displayName || "").trim(),
    graduationYear: author.graduationYear ? String(author.graduationYear).trim() : "",
    branch: (author.branch || "").trim(),
    organization: (author.organization || "").trim(),
    designation: (author.designation || "").trim(),
    linkedin: (author.linkedin || "").trim(),
    profilePhoto: author.profilePhoto || author.photoURL || "",
  };
}

function formatBlogDoc(snapshotDoc) {
  const data = snapshotDoc.data();
  // Strip sensitive author email and authentication metadata from public objects
  const {
    email: _rootEmail,
    authorEmail: _authorEmail,
    alumniEmail: _alumniEmail,
    reviewedBy: _reviewedBy,
    publishedBy: _publishedBy,
    editToken: _editToken,
    ...safeData
  } = data;

  const alumniAuthor = data.alumniAuthor
    ? sanitizeAlumniAuthor(data.alumniAuthor)
    : null;

  return {
    id: snapshotDoc.id,
    ...safeData,
    authorUid: data.authorUid || data.authorId || null,
    authorId: data.authorId || data.authorUid || null,
    submissionId: data.submissionId || null,
    alumniAuthor,
    date: data.createdAt?.toDate
      ? data.createdAt.toDate().toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : "Recently",
  };
}

function formatStaticBlog(blog) {
  return {
    ...blog,
    id: String(blog.id),
    slug: blog.slug,
    featuredImage: blog.featuredImage || blog.image || "",
    status: "Published",
    content: blog.content || `<p>${blog.excerpt || ""}</p>`,
  };
}

/**
 * Paginated blog fetch for public and admin views.
 * Limits reads to pageSize (default 6).
 */
export const getBlogsPage = async ({
  pageSize = 6,
  lastDoc = null,
  category = "All",
  onlyPublished = true,
} = {}) => {
  try {
    let constraints = [];

    if (onlyPublished) {
      constraints.push(where("status", "==", "Published"));
    }

    if (category && category !== "All") {
      constraints.push(where("category", "==", category));
    }

    constraints.push(orderBy("createdAt", "desc"));
    constraints.push(limit(pageSize));

    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    const q = query(blogsRef, ...constraints);
    const snapshot = await getDocs(q);

    const blogs = snapshot.docs.map(formatBlogDoc);
    const newLastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
    const hasMore = snapshot.docs.length === pageSize;

    return { blogs, lastDoc: newLastDoc, hasMore };
  } catch (err) {
    console.error("Error in getBlogsPage query:", err);
    try {
      // Avoid an unrestricted fallback query: it violates the public read rule
      // whenever unpublished posts are present.
      const constraints = onlyPublished
        ? [where("status", "==", "Published")]
        : [];
      const snapshot = await getDocs(query(blogsRef, ...constraints));
      const blogs = snapshot.docs
        .map(formatBlogDoc)
        .filter((blog) => category === "All" || blog.category === category)
        .slice(0, pageSize);
      return { blogs, lastDoc: null, hasMore: false };
    } catch (fallbackError) {
      console.warn("Unable to read Firestore blogs; using bundled articles.", fallbackError);
      const blogs = staticBlogs
        .map(formatStaticBlog)
        .filter((blog) => category === "All" || blog.category === category)
        .slice(0, pageSize);
      return { blogs, lastDoc: null, hasMore: false };
    }
  }
};

/**
 * Checks if TipTap content (JSON object or HTML string) contains actual text.
 */
function hasActualContent(content) {
  if (!content) return false;

  // If it's a TipTap JSON doc object
  if (typeof content === "object") {
    // Walk the content array to find any text nodes
    const hasText = (node) => {
      if (!node) return false;
      if (node.text && node.text.trim().length > 0) return true;
      if (node.type === "image") return true; // images count as content
      if (Array.isArray(node.content)) {
        return node.content.some(hasText);
      }
      return false;
    };
    return hasText(content);
  }

  // If it's an HTML string
  if (typeof content === "string") {
    const plainText = content
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim();
    return plainText.length > 0;
  }

  return false;
}

/**
 * Validates requirements for publishing.
 */
export const validatePublishRequirements = (blog) => {
  if (!blog.title || !blog.title.trim()) {
    return { isValid: false, error: "Cannot publish: Blog Title is required." };
  }

  if (!hasActualContent(blog.content)) {
    return { isValid: false, error: "Cannot publish: Blog Content cannot be empty." };
  }

  if (!blog.isAlumniContribution && (!blog.featuredImage || !blog.featuredImage.trim())) {
    return {
      isValid: false,
      error: "Cannot publish: Featured Image is required.",
    };
  }

  if (!blog.category || !blog.category.trim()) {
    return { isValid: false, error: "Cannot publish: Category is required." };
  }

  return { isValid: true, error: null };
};

/**
 * Publishes or saves a new blog to Firestore.
 */
export const publishBlog = async (blog) => {
  const isPublishing = blog.status === "Published";

  if (isPublishing) {
    const validation = validatePublishRequirements(blog);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }
  }

  const finalSlug = await generateUniqueSlug(blog.slug || blog.title);
  const sanitizedAuthor = sanitizeAlumniAuthor(blog.alumniAuthor);

  const payload = {
    title: (blog.title || "").trim(),
    slug: finalSlug,
    category: blog.category || "Club News",
    featuredImage: blog.featuredImage || "",
    tags: Array.isArray(blog.tags) ? blog.tags : [],
    seo: blog.seo || "",
    publishDate: blog.publishDate || "",
    status: blog.status || "Draft",
    author: blog.isAlumniContribution
      ? (resolveAuthorName(blog.author, sanitizedAuthor, blog) !== "Abhyudaya Alumni"
          ? resolveAuthorName(blog.author, sanitizedAuthor, blog)
          : (blog.author || (sanitizedAuthor && sanitizedAuthor.name) || "Abhyudaya Alumni"))
      : (blog.author || "Admin"),
    isAlumniContribution: Boolean(blog.isAlumniContribution),
    alumniAuthor: sanitizedAuthor,
    authorUid: blog.authorUid || null,
    authorId: blog.authorId || null,
    submissionId: blog.submissionId || null,
    excerpt: blog.excerpt || "",
    content: blog.content || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    publishedAt: isPublishing ? serverTimestamp() : null,
  };

  const docRef = await addDoc(blogsRef, payload);
  return { id: docRef.id, slug: finalSlug };
};

/**
 * Updates an existing blog document.
 */
export const updateBlogService = async (id, blogData) => {
  const isPublishing = blogData.status === "Published";

  if (isPublishing) {
    const validation = validatePublishRequirements(blogData);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }
  }

  const finalSlug = await generateUniqueSlug(
    blogData.slug || blogData.title,
    id
  );

  const ref = doc(db, BLOGS_COLLECTION, id);
  const snap = await getDoc(ref);
  const currentData = snap.exists() ? snap.data() : {};

  let publishedAt = currentData.publishedAt || null;
  if (isPublishing && !publishedAt) {
    publishedAt = serverTimestamp();
  }

  const rawAuthor = blogData.alumniAuthor !== undefined ? blogData.alumniAuthor : (currentData.alumniAuthor || null);
  const sanitizedAuthor = sanitizeAlumniAuthor(rawAuthor);

  const payload = {
    title: (blogData.title || "").trim(),
    slug: finalSlug,
    category: blogData.category || "Club News",
    featuredImage: blogData.featuredImage || "",
    tags: Array.isArray(blogData.tags) ? blogData.tags : [],
    seo: blogData.seo || "",
    publishDate: blogData.publishDate || "",
    status: blogData.status || "Draft",
    author: (blogData.isAlumniContribution ?? currentData.isAlumniContribution)
      ? (resolveAuthorName(blogData.author, sanitizedAuthor, blogData, currentData) !== "Abhyudaya Alumni"
          ? resolveAuthorName(blogData.author, sanitizedAuthor, blogData, currentData)
          : (blogData.author || (sanitizedAuthor && sanitizedAuthor.name) || currentData.author || "Abhyudaya Alumni"))
      : (blogData.author || currentData.author || "Admin"),
    isAlumniContribution:
      blogData.isAlumniContribution !== undefined
        ? Boolean(blogData.isAlumniContribution)
        : Boolean(currentData.isAlumniContribution),
    alumniAuthor: sanitizedAuthor,
    authorUid: blogData.authorUid || currentData.authorUid || null,
    authorId: blogData.authorId || currentData.authorId || null,
    submissionId: blogData.submissionId !== undefined ? blogData.submissionId : (currentData.submissionId || null),
    excerpt: blogData.excerpt || "",
    content: blogData.content || null,
    updatedAt: serverTimestamp(),
    publishedAt: publishedAt,
  };

  await updateDoc(ref, payload);
  return { slug: finalSlug };
};

/**
 * Directly updates status of a blog.
 */
export const updateBlogStatusService = async (id, newStatus) => {
  const ref = doc(db, BLOGS_COLLECTION, id);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error("Blog not found.");
  }

  const currentData = snap.data();

  if (newStatus === "Published") {
    const validation = validatePublishRequirements(currentData);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }
  }

  const payload = {
    status: newStatus,
    updatedAt: serverTimestamp(),
  };

  if (newStatus === "Published" && !currentData.publishedAt) {
    payload.publishedAt = serverTimestamp();
  }

  await updateDoc(ref, payload);
};

export const deleteBlogService = async (id) => {
  await deleteDoc(doc(db, BLOGS_COLLECTION, id));
};

/**
 * Retrieves a blog by unique slug.
 */
export const getBlogBySlug = async (slug) => {
  const normalizedSlug = normalizeRouteSlug(slug);
  if (!normalizedSlug) return null;

  try {
    // Without the status constraint this public query is denied by Firestore
    // rules, even if the requested post itself is published.
    const q = query(
      blogsRef,
      where("status", "==", "Published"),
      where("slug", "==", normalizedSlug),
      limit(1)
    );
    const snap = await getDocs(q);

    if (!snap.empty) return formatBlogDoc(snap.docs[0]);

    const documentId = String(slug).trim();
    if (documentId && !documentId.includes("/")) {
      const docSnap = await getDoc(doc(blogsRef, documentId));
      if (docSnap.exists()) return formatBlogDoc(docSnap);
    }
  } catch (err) {
    console.warn("Unable to load blog from Firestore; checking bundled articles.", err);
  }

  return staticBlogs
    .map(formatStaticBlog)
    .find((blog) => normalizeRouteSlug(blog.slug) === normalizedSlug || blog.id === String(slug).trim()) || null;
};
