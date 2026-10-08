import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import "./BlogDetails.css";

// ── Heavy Tiptap modules loaded dynamically — only when a blog post with
//    Tiptap JSON content is actually viewed (saves ~300 kB on initial load).
// ──────────────────────────────────────────────────────────────────────────
import { db } from "../Firebase/firebase";
import { getBlogBySlug } from "../Firebase/blogService";
import { resolveAuthorName } from "../utils/authorHelper";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
} from "firebase/firestore";

import {
  FiArrowLeft,
  FiCalendar,
  FiClock,
  FiUser,
  FiCopy,
} from "react-icons/fi";

import {
  FaWhatsapp,
  FaLinkedin,
} from "react-icons/fa";

import { FaXTwitter } from "react-icons/fa6";

import BlogPostingSchema from "../components/seo/schemas/BlogPostingSchema";
import BreadcrumbSchema from "../components/seo/schemas/BreadcrumbSchema";
import OrganizationSchema from "../components/seo/schemas/OrganizationSchema";
import LatestBlogsSidebar from "../components/blog/LatestBlogsSidebar";
import { markPrerenderReady } from "../utils/prerender.js";

async function renderBlogContent(content) {
  if (!content) return "";
  if (typeof content === "object") {
    try {
      const [
        { generateHTML },
        { default: StarterKit },
        { default: Underline },
        { default: LinkExtension },
        { default: TextAlign },
        { default: ImageExtension },
      ] = await Promise.all([
        import("@tiptap/html"),
        import("@tiptap/starter-kit"),
        import("@tiptap/extension-underline"),
        import("@tiptap/extension-link"),
        import("@tiptap/extension-text-align"),
        import("@tiptap/extension-image"),
      ]);
      return generateHTML(content, [
        StarterKit,
        Underline,
        LinkExtension,
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        ImageExtension,
      ]);
    } catch (e) {
      console.error("Error generating HTML from Tiptap JSON:", e);
      return "";
    }
  }
  if (typeof content === "string" && content.trim().startsWith("{")) {
    try {
      const json = JSON.parse(content);
      return await renderBlogContent(json);
    } catch {
      return content;
    }
  }
  return content; // Legacy HTML string fallback
}


const SITE_URL = "https://www.abhyudayaclub.in";
const ORG_NAME = "Abhyudaya Club";

export default function BlogDetails() {
  // Extract route parameters flexibly (supports both :slug and :id params)
  const params = useParams();
  const blogIdentifier = params.slug || params.id || "";

  // ==========================
  // STATES
  // ==========================

  const [blog, setBlog] = useState(null);
  // Internal Firestore document ID — used for comments (preserves existing comments)
  const [blogDocId, setBlogDocId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Resolved HTML string from the async renderBlogContent function
  const [renderedContent, setRenderedContent] = useState("");

  const [scrollProgress, setScrollProgress] = useState(0);

  const [relatedBlogs, setRelatedBlogs] = useState([]);

  const [copied, setCopied] = useState(false);

  // Comments
  const [comments, setComments] = useState([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [posting, setPosting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const canonicalUrl = `${SITE_URL}/blog/${encodeURIComponent(blogIdentifier)}`;

  const shareText = blog
    ? `${blog.title} | ${ORG_NAME}`
    : `${ORG_NAME} Blog`;

  // ==========================
  // SHARE
  // ==========================

  const shareWhatsapp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(
        `${shareText}\n${canonicalUrl}`
      )}`,
      "_blank"
    );
  };

  const shareLinkedin = () => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
        canonicalUrl
      )}`,
      "_blank"
    );
  };

  const shareTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        shareText
      )}&url=${encodeURIComponent(canonicalUrl)}`,
      "_blank"
    );
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(canonicalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard write failed silently
    }
  };

  // ==========================
  // POST COMMENT
  // ==========================

  const submitComment = async () => {
    const trimmedName = name.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName || !trimmedMessage) {
      alert("Please enter your name and comment.");
      return;
    }

    if (trimmedName.length < 3) {
      alert("Name must contain at least 3 characters.");
      return;
    }

    if (trimmedName.length > 30) {
      alert("Name is too long.");
      return;
    }

    if (trimmedMessage.length < 5) {
      alert("Comment is too short.");
      return;
    }

    if (trimmedMessage.length > 500) {
      alert("Comment cannot exceed 500 characters.");
      return;
    }

    if (!blogDocId) {
      alert("Unable to post comment. Please reload the page.");
      return;
    }

    try {
      setPosting(true);

      // Always use blogDocId (Firestore document ID) for comments
      const commentsRef = collection(db, "blogs", blogDocId, "comments");

      await addDoc(commentsRef, {
        name: trimmedName,
        message: trimmedMessage,
        createdAt: serverTimestamp(),
      });

      setName("");
      setMessage("");
      setCooldown(30);
    } catch (error) {
      alert(error.message);
    } finally {
      setPosting(false);
    }
  };

  // ==========================
  // FETCH BLOG BY SLUG OR DOC ID
  // ==========================

  useEffect(() => {
    let isCurrent = true;

    if (!blogIdentifier) {
      setLoading(false);
      setBlog(null);
      setLoadError(null);
      return;
    }

    const fetchBlog = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        setBlog(null);
        setBlogDocId(null);
        setRelatedBlogs([]);

        const currentBlog = await getBlogBySlug(blogIdentifier);
        if (!isCurrent || !currentBlog) {
          return;
        }

        // If this is an alumni contribution, ensure author profile is resolved with real user data
        if (currentBlog.isAlumniContribution) {
          let authorUid =
            currentBlog.authorUid ||
            currentBlog.authorId ||
            currentBlog.alumniAuthor?.uid ||
            currentBlog.createdBy;

          let currentAuthorName = resolveAuthorName(
            currentBlog.alumniAuthor,
            currentBlog.author,
            currentBlog
          );

          // If author name is generic or missing, try resolving from submission doc or users doc
          if (!currentAuthorName || currentAuthorName === "Abhyudaya Alumni") {
            try {
              // 1. If submissionId exists, fetch submission doc to resolve author name or authorUid
              if (currentBlog.submissionId) {
                try {
                  const subSnap = await getDoc(
                    doc(db, "alumniSubmissions", currentBlog.submissionId)
                  );
                  if (subSnap.exists()) {
                    const subData = subSnap.data();
                    if (!authorUid) {
                      authorUid =
                        subData.authorUid ||
                        subData.authorId ||
                        subData.uid ||
                        subData.userId ||
                        subData.createdBy ||
                        subData.author?.uid;
                    }
                    const nameFromSub = resolveAuthorName(
                      subData.author,
                      subData
                    );
                    if (nameFromSub && nameFromSub !== "Abhyudaya Alumni") {
                      currentAuthorName = nameFromSub;
                    }
                  }
                } catch (subErr) {
                  console.warn("Could not fetch submission for alumni author:", subErr);
                }
              }

              // 2. If authorUid exists, fetch users/{authorUid}
              if (authorUid) {
                const userRef = doc(db, "users", authorUid);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                  const userData = userSnap.data();
                  const actualName = resolveAuthorName(userData);
                  if (actualName && actualName !== "Abhyudaya Alumni") {
                    currentAuthorName = actualName;
                  }
                }
              }
            } catch (err) {
              console.warn("Could not fetch user profile for alumni article author:", err);
            }
          }

          if (currentAuthorName && currentAuthorName !== "Abhyudaya Alumni") {
            currentBlog.author = currentAuthorName;
            if (currentBlog.alumniAuthor) {
              currentBlog.alumniAuthor = {
                ...currentBlog.alumniAuthor,
                name: currentAuthorName,
              };
            } else {
              currentBlog.alumniAuthor = { name: currentAuthorName };
            }
          }
        }

        setBlogDocId(currentBlog.id);
        setBlog(currentBlog);

        // Fetch related blogs — prefer same category, exclude current
        try {
          const relatedQuery = currentBlog.category
            ? query(
                collection(db, "blogs"),
                where("status", "==", "Published"),
                where("category", "==", currentBlog.category)
              )
            : query(collection(db, "blogs"), where("status", "==", "Published"));

          const blogsSnapshot = await getDocs(relatedQuery);

          const related = blogsSnapshot.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((item) => item.id !== currentBlog.id && item.slug !== currentBlog.slug)
            .slice(0, 3);

          if (isCurrent) setRelatedBlogs(related);
        } catch (relatedErr) {
          console.warn("Error fetching related blogs:", relatedErr);
        }
      } catch (error) {
        console.error("Error loading blog details:", error);
        if (isCurrent) setLoadError(error);
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    fetchBlog();
    return () => {
      isCurrent = false;
    };
  }, [blogIdentifier]);

  // ==========================
  // READING PROGRESS
  // ==========================

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress =
        totalHeight > 0 ? (window.scrollY / totalHeight) * 100 : 0;
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ==========================
  // LOAD COMMENTS (uses blogDocId)
  // ==========================

  const fetchComments = async () => {
    if (!blogDocId) return;
    try {
      const commentsRef = collection(db, "blogs", blogDocId, "comments");
      const q = query(commentsRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setComments(data);
    } catch (err) {
      console.warn("Error loading comments:", err);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [blogDocId]);

  // ==========================
  // RESOLVE BLOG CONTENT (async → HTML string)
  // ==========================

  useEffect(() => {
    let cancelled = false;
    if (!blog?.content) {
      setRenderedContent("");
      if (!loading) markPrerenderReady();
      return;
    }
    renderBlogContent(blog.content).then((html) => {
      if (!cancelled) {
        setRenderedContent(html);
        markPrerenderReady();
      }
    });
    return () => { cancelled = true; };
  }, [blog?.content, loading]);

  // ==========================
  // COOLDOWN TIMER
  // ==========================

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // ==========================
  // LOADING STATE
  // ==========================

  if (loading) {
    return (
      <section className="blog-details">
        <div className="blog-details-container">
          <h2>Loading Blog...</h2>
        </div>
      </section>
    );
  }

  // ==========================
  // BLOG NOT FOUND STATE
  // ==========================

  if (!blog) {
    if (loadError) {
      return (
        <section className="blog-details">
          <div className="blog-details-container" style={{ textAlign: "center", padding: "60px 20px" }}>
            <h1 style={{ marginBottom: "16px" }}>Unable to Load Blog</h1>
            <p style={{ color: "#64748b", marginBottom: "24px" }}>
              Please check your connection and try again.
            </p>
            <Link to="/blog" className="back-btn" style={{ display: "inline-flex" }}>
              <FiArrowLeft />
              Back to Blog
            </Link>
          </div>
        </section>
      );
    }

    return (
      <>
        <Helmet>
          <title>Blog Not Found | Abhyudaya Club</title>
          <meta name="robots" content="noindex,follow" />
        </Helmet>
        <section className="blog-details">
          <div className="blog-details-container" style={{ textAlign: "center", padding: "60px 20px" }}>
            <h1 style={{ marginBottom: "16px" }}>Blog Not Found</h1>
            <p style={{ color: "#64748b", marginBottom: "24px" }}>
              The requested article could not be found or may have been removed.
            </p>
            <Link to="/blog" className="back-btn" style={{ display: "inline-flex" }}>
              <FiArrowLeft />
              Back to Blog
            </Link>
          </div>
        </section>
      </>
    );
  }

  // ==========================
  // SEO — derived values
  // ==========================

  const metaDescription =
    blog.seo ||
    blog.excerpt ||
    (blog.content || "").replace(/<[^>]+>/g, "").slice(0, 160);

  const ogImage = blog.featuredImage || `${SITE_URL}/og-image.jpg`;

  const tags = Array.isArray(blog.tags) ? blog.tags : [];
  const keywords = [
    blog.category,
    blog.title,
    "Abhyudaya Club",
    "MPEC Kanpur",
    "MPEC",
    ...tags,
  ]
    .filter(Boolean)
    .join(", ");

  // Resolved author display name — never exposes email/UID, never falls back to "Alumnus"
  const authorDisplayName = resolveAuthorName(blog?.alumniAuthor, blog?.author);

  const breadcrumbItems = [
    { name: "Home", url: SITE_URL },
    { name: "Blog", url: `${SITE_URL}/blog` },
    { name: blog.title, url: canonicalUrl },
  ];

  return (
    <>
      {/* ====== SEO ====== */}
      <Helmet>
        <title>{blog.title} | {ORG_NAME}</title>
        <meta name="description" content={metaDescription} />
        <meta name="keywords" content={keywords} />
        <meta name="author" content={blog.isAlumniContribution ? authorDisplayName : (blog.author || "Abhyudaya Club")} />
        <link rel="canonical" href={canonicalUrl} />
        <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1" />

        {/* Open Graph */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={`${blog.title} | ${ORG_NAME}`} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content={ORG_NAME} />
        <meta property="og:locale" content="en_IN" />
        {blog.dateISO && <meta property="article:published_time" content={blog.dateISO} />}
        {blog.updatedDateISO && <meta property="article:modified_time" content={blog.updatedDateISO} />}
        <meta property="article:author" content={blog.isAlumniContribution ? authorDisplayName : (blog.author || "Abhyudaya Club")} />
        <meta property="article:section" content={blog.category || "Blog"} />
        {tags.map((tag) => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${blog.title} | ${ORG_NAME}`} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image" content={ogImage} />
      </Helmet>

      {/* JSON-LD Structured Data */}
      <BlogPostingSchema blog={blog} canonicalUrl={canonicalUrl} />
      <BreadcrumbSchema items={breadcrumbItems} />
      <OrganizationSchema />

      <section className="blog-details">

        {/* Reading Progress */}
        <div
          className="reading-progress"
          style={{ width: `${scrollProgress}%` }}
        />

        <div className="blog-details-container">

          <div className="blog-top">
            <Link to="/blog" className="back-btn">
              <FiArrowLeft />
              Back to Blog
            </Link>
          </div>

          <span className="details-category">{blog.category}</span>

          <h1>{blog.title}</h1>

          <div className="details-meta">
            <span>
              <FiUser aria-hidden="true" />
              {blog.isAlumniContribution ? authorDisplayName : (blog.author || "Admin")}
            </span>
            <span>
              <FiCalendar aria-hidden="true" />
              {blog.date}
            </span>
            <span>
              <FiClock aria-hidden="true" />
              {blog.readTime || "5 min read"}
            </span>
          </div>

          {/* Alumni Contributor Spotlight Card — removed per design decision */}

          {/* Featured Image — fetchpriority=high as it is the LCP element */}
          {blog.featuredImage && (
            <img
              src={blog.featuredImage}
              alt={`${blog.title} — featured image`}
              className="details-featured-image"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              width="1200"
              height="630"
              style={{ width: "100%", borderRadius: "12px", marginBottom: "2rem" }}
            />
          )}

          {/* Share Buttons */}
          <div className="share-section">
            <div className="share-heading-group">
              <h2 className="share-title">Share this article</h2>
              <p className="share-subtitle">Share this story with your network</p>
            </div>
            <div className="share-buttons" role="group" aria-label="Share this article">
              <button
                type="button"
                className="share-btn whatsapp"
                onClick={shareWhatsapp}
                aria-label="Share on WhatsApp"
                title="Share on WhatsApp"
              >
                <FaWhatsapp aria-hidden="true" />
                <span className="share-sr-only">WhatsApp</span>
              </button>
              <button
                type="button"
                className="share-btn linkedin"
                onClick={shareLinkedin}
                aria-label="Share on LinkedIn"
                title="Share on LinkedIn"
              >
                <FaLinkedin aria-hidden="true" />
                <span className="share-sr-only">LinkedIn</span>
              </button>
              <button
                type="button"
                className="share-btn twitter"
                onClick={shareTwitter}
                aria-label="Share on X (Twitter)"
                title="Share on X"
              >
                <FaXTwitter aria-hidden="true" />
                <span className="share-sr-only">X</span>
              </button>
              <button
                type="button"
                className="share-btn copy"
                onClick={copyLink}
                aria-label={copied ? "Link copied" : "Copy article link"}
              >
                <FiCopy aria-hidden="true" />
                <span aria-live="polite">{copied ? "✓ Link copied" : "Copy link"}</span>
              </button>
            </div>
          </div>

          {/* Blog Content */}
          <div
            className="details-content"
            dangerouslySetInnerHTML={{ __html: renderedContent }}
          />



          {/* COMMENTS SECTION */}
          <div className="comments-section">

            <h2>Leave a Comment</h2>

            <div className="comment-form">
              <input
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-label="Your name"
              />
              <textarea
                rows="5"
                placeholder="Write your comment..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                aria-label="Your comment"
              />
              <button
                onClick={submitComment}
                disabled={posting || cooldown > 0}
              >
                {posting
                  ? "Posting..."
                  : cooldown > 0
                  ? `Wait ${cooldown}s`
                  : "Post Comment"}
              </button>
            </div>

            {/* COMMENTS LIST */}
            <div className="comments-list">
              <h3>Comments ({comments.length})</h3>

              {comments.length === 0 ? (
                <div className="no-comments">
                  No comments yet. Be the first to comment!
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="comment-card">
                    <div className="comment-header">
                      <div className="comment-avatar" aria-hidden="true">
                        {comment.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4>{comment.name}</h4>
                        <span>
                          {comment.createdAt?.toDate
                            ? comment.createdAt.toDate().toLocaleString()
                            : "Just now"}
                        </span>
                      </div>
                    </div>
                    <p className="comment-message">{comment.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Latest Articles Sidebar — improves internal linking */}
          <LatestBlogsSidebar currentSlug={blogIdentifier} />

          <hr className="blog-divider" />

          {/* RELATED ARTICLES */}
          <div className="related-section">
            <h2>Related Articles</h2>

            <div className="related-grid">
              {relatedBlogs.length > 0 ? (
                relatedBlogs.map((item) => (
                  <Link
                    key={item.id}
                    to={`/blog/${item.slug || item.id}`}
                    className="related-card"
                    aria-label={`Read related article: ${item.title}`}
                  >
                    {item.featuredImage && (
                      <img
                        src={item.featuredImage}
                        alt={`${item.title} featured image`}
                        width="400"
                        height="250"
                        loading="lazy"
                        decoding="async"
                      />
                    )}
                    <div className="related-body">
                      <span>{item.category}</span>
                      <h3>{item.title}</h3>
                      <p>
                        {(item.excerpt || (item.content || "").replace(/<[^>]*>/g, "")).slice(0, 100)}...
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <p>No related articles available.</p>
              )}
            </div>
          </div>

        </div>
      </section>
    </>
  );
}
