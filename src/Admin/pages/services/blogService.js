import { db } from "../../../Firebase/firebase";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { generateUniqueSlug } from "../../../utils/slug";

/**
 * Validates whether a blog meets all requirements for PUBLISHING.
 * Returns { isValid: boolean, error: string|null }
 *
 * Requirements: Cannot publish without Title, Content, Featured Image, Category
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
 *
 * @param {Object} blog - Blog object containing title, content, status, etc.
 * @returns {Promise<{ id: string, slug: string }>}
 */
export const publishBlog = async (blog) => {
  const isPublishing = blog.status === "Published";

  // Validate publish requirements
  if (isPublishing) {
    const validation = validatePublishRequirements(blog);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }
  }

  // Ensure unique URL slug
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

  const docRef = await addDoc(collection(db, "blogs"), payload);
  return { id: docRef.id, slug: finalSlug };
};

/**
 * Updates an existing blog document in Firestore.
 *
 * @param {string} id
 * @param {Object} blogData
 * @returns {Promise<{ slug: string }>}
 */
export const updateBlogService = async (id, blogData) => {
  const isPublishing = blogData.status === "Published";

  // Validate publish requirements if target status is Published
  if (isPublishing) {
    const validation = validatePublishRequirements(blogData);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }
  }

  // Ensure unique URL slug (excluding current blog ID)
  const finalSlug = await generateUniqueSlug(
    blogData.slug || blogData.title,
    id
  );

  // Fetch current doc to check if publishedAt already exists
  const ref = doc(db, "blogs", id);
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
 * Directly updates status of a blog (e.g. Unpublish, Archive, Publish).
 *
 * @param {string} id
 * @param {"Draft" | "Published" | "Archived"} newStatus
 */
export const updateBlogStatusService = async (id, newStatus) => {
  const ref = doc(db, "blogs", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error("Blog not found.");
  }

  const currentData = snap.data();

  // If publishing, validate requirements
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

/**
 * Retrieves a blog by unique slug.
 *
 * @param {string} slug
 * @returns {Promise<Object|null>}
 */
export const getBlogBySlug = async (slug) => {
  if (!slug) return null;

  const q = query(collection(db, "blogs"), where("slug", "==", slug.trim()));
  const snap = await getDocs(q);

  if (snap.empty) return null;

  const docSnap = snap.docs[0];
  return { id: docSnap.id, ...docSnap.data() };
};