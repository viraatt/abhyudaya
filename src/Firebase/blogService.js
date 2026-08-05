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
import { generateUniqueSlug } from "../utils/slug";

const BLOGS_COLLECTION = "blogs";
const blogsRef = collection(db, BLOGS_COLLECTION);

function formatBlogDoc(snapshotDoc) {
  const data = snapshotDoc.data();
  return {
    id: snapshotDoc.id,
    ...data,
    date: data.createdAt?.toDate
      ? data.createdAt.toDate().toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : "Recently",
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
    // Fallback if index missing or error
    let constraints = [limit(pageSize)];
    if (lastDoc) constraints.push(startAfter(lastDoc));
    const fallbackQ = query(blogsRef, ...constraints);
    const snapshot = await getDocs(fallbackQ);
    const blogs = snapshot.docs.map(formatBlogDoc);
    const filtered = onlyPublished
      ? blogs.filter((b) => (b.status || "").toLowerCase() === "published")
      : blogs;
    const newLastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
    return { blogs: filtered, lastDoc: newLastDoc, hasMore: snapshot.docs.length === pageSize };
  }
};

/**
 * Validates requirements for publishing.
 */
export const validatePublishRequirements = (blog) => {
  if (!blog.title || !blog.title.trim()) {
    return { isValid: false, error: "Cannot publish: Blog Title is required." };
  }

  if (!blog.content) {
    return { isValid: false, error: "Cannot publish: Blog Content cannot be empty." };
  }

  if (!blog.featuredImage || !blog.featuredImage.trim()) {
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

  const payload = {
    title: (blog.title || "").trim(),
    slug: finalSlug,
    category: blog.category || "Club News",
    featuredImage: blog.featuredImage || "",
    tags: Array.isArray(blog.tags) ? blog.tags : [],
    seo: blog.seo || "",
    publishDate: blog.publishDate || "",
    status: blog.status || "Draft",
    author: blog.author || "Admin",
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

  const payload = {
    title: (blogData.title || "").trim(),
    slug: finalSlug,
    category: blogData.category || "Club News",
    featuredImage: blogData.featuredImage || "",
    tags: Array.isArray(blogData.tags) ? blogData.tags : [],
    seo: blogData.seo || "",
    publishDate: blogData.publishDate || "",
    status: blogData.status || "Draft",
    author: blogData.author || "Admin",
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
  if (!slug) return null;

  const q = query(blogsRef, where("slug", "==", slug.trim()), limit(1));
  const snap = await getDocs(q);

  if (snap.empty) return null;

  const docSnap = snap.docs[0];
  return formatBlogDoc(docSnap);
};
