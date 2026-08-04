import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import "./BlogDetails.css";

import { db } from "../Firebase/firebase";

import {
  collection,
  getDocs,
  addDoc,
  onSnapshot,
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

const SITE_URL = "https://abhyudayaclub.in";
const ORG_NAME = "Abhyudaya Club";

export default function BlogDetails() {
  // Use slug from URL params
  const { slug } = useParams();

  // ==========================
  // STATES
  // ==========================

  const [blog, setBlog] = useState(null);
  // Internal Firestore document ID — used for comments (preserves existing comments)
  const [blogDocId, setBlogDocId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [scrollProgress, setScrollProgress] = useState(0);

  const [relatedBlogs, setRelatedBlogs] = useState([]);

  const [copied, setCopied] = useState(false);

  // Comments
  const [comments, setComments] = useState([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [posting, setPosting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const canonicalUrl = `${SITE_URL}/blog/${slug}`;

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
  // FETCH BLOG BY SLUG
  // ==========================

  useEffect(() => {
    if (!slug) return;

    const fetchBlog = async () => {
      try {
        setLoading(true);

        // Query by slug (not by document ID)
        const q = query(
          collection(db, "blogs"),
          where("slug", "==", slug)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setBlog(null);
          setLoading(false);
          return;
        }

        const docSnap = snapshot.docs[0];
        const data = docSnap.data();

        // Store the Firestore document ID internally for comments
        setBlogDocId(docSnap.id);

        const currentBlog = {
          id: docSnap.id,
          ...data,
          date: data.createdAt?.toDate
            ? data.createdAt.toDate().toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })
            : "Recently",
          dateISO: data.createdAt?.toDate
            ? data.createdAt.toDate().toISOString()
            : null,
          updatedDateISO: data.updatedAt?.toDate
            ? data.updatedAt.toDate().toISOString()
            : null,
        };

        setBlog(currentBlog);

        // Fetch related blogs (exclude current)
        const blogsSnapshot = await getDocs(
          query(collection(db, "blogs"), where("status", "==", "Published"))
        );

        const related = blogsSnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((item) => item.slug !== slug)
          .slice(0, 3);

        setRelatedBlogs(related);
      } catch {
        setBlog(null);
      } finally {
        setLoading(false);
      }
    };

    fetchBlog();
  }, [slug]);

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

  useEffect(() => {
    if (!blogDocId) return;

    const commentsRef = collection(db, "blogs", blogDocId, "comments");

    const q = query(commentsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setComments(data);
      },
      () => {
        // Snapshot error — fail silently
      }
    );

    return () => unsubscribe();
  }, [blogDocId]);

  // ==========================
  // COOLDOWN TIMER
  // ==========================

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // ==========================
  // LOADING
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
  // BLOG NOT FOUND
  // ==========================

  if (!blog) {
    return (
      <section className="blog-details">
        <div className="blog-details-container">
          <h1>Blog Not Found</h1>
          <Link to="/blog" className="back-btn">
            <FiArrowLeft />
            Back to Blog
          </Link>
        </div>
      </section>
    );
  }

  // ==========================
  // SEO — derived values
  // ==========================

  const metaDescription =
    blog.seo ||
    blog.excerpt ||
    (blog.content || "").replace(/<[^>]+>/g, "").slice(0, 160);

  const ogImage = blog.featuredImage || `${SITE_URL}/favicon.png`;

  // JSON-LD structured data
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: blog.title,
    description: metaDescription,
    image: ogImage,
    author: {
      "@type": "Person",
      name: blog.author || "Admin",
    },
    publisher: {
      "@type": "Organization",
      name: ORG_NAME,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/favicon.png`,
      },
    },
    datePublished: blog.dateISO || undefined,
    dateModified: blog.updatedDateISO || blog.dateISO || undefined,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${SITE_URL}/blog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: blog.title,
        item: canonicalUrl,
      },
    ],
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: ORG_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.png`,
    sameAs: [
      "https://www.instagram.com/abhyudayaclub",
      "https://www.linkedin.com/company/abhyudayaclub",
    ],
  };

  return (
    <>
      <Helmet>
        <title>{blog.title} | {ORG_NAME}</title>
        <meta name="description" content={metaDescription} />
        <meta name="keywords" content={`${blog.category}, ${blog.title}, Abhyudaya Club, MPEC, ${(blog.tags || []).join(", ")}`} />
        <link rel="canonical" href={canonicalUrl} />

        {/* Open Graph */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={`${blog.title} | ${ORG_NAME}`} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content={ORG_NAME} />
        {blog.dateISO && <meta property="article:published_time" content={blog.dateISO} />}
        {blog.updatedDateISO && <meta property="article:modified_time" content={blog.updatedDateISO} />}
        <meta property="article:author" content={blog.author || "Admin"} />
        <meta property="article:section" content={blog.category || "Blog"} />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${blog.title} | ${ORG_NAME}`} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image" content={ogImage} />

        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(articleSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(organizationSchema)}
        </script>
      </Helmet>

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
              {blog.author}
            </span>
            <span>
              <FiCalendar aria-hidden="true" />
              {blog.date}
            </span>
            <span>
              <FiClock aria-hidden="true" />
              {blog.readTime}
            </span>
          </div>

          {/* Featured Image */}
          {blog.featuredImage && (
            <img
              src={blog.featuredImage}
              alt={blog.title}
              className="details-featured-image"
              loading="eager"
              style={{ width: "100%", borderRadius: "12px", marginBottom: "2rem" }}
            />
          )}

          {/* Share Buttons */}
          <div className="share-section">
            <h3>Share this article</h3>
            <div className="share-buttons">
              <button
                className="share-btn whatsapp"
                onClick={shareWhatsapp}
                aria-label="Share on WhatsApp"
              >
                <FaWhatsapp aria-hidden="true" />
                WhatsApp
              </button>
              <button
                className="share-btn linkedin"
                onClick={shareLinkedin}
                aria-label="Share on LinkedIn"
              >
                <FaLinkedin aria-hidden="true" />
                LinkedIn
              </button>
              <button
                className="share-btn twitter"
                onClick={shareTwitter}
                aria-label="Share on X (Twitter)"
              >
                <FaXTwitter aria-hidden="true" />
                X
              </button>
              <button
                className="share-btn copy"
                onClick={copyLink}
                aria-label={copied ? "Link copied" : "Copy article link"}
              >
                <FiCopy aria-hidden="true" />
                {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>
          </div>

          {/* Blog Content */}
          <div
            className="details-content"
            dangerouslySetInnerHTML={{ __html: blog.content || "" }}
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
              <h2>Comments ({comments.length})</h2>

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
                  >
                    <img
                      src={item.featuredImage || "https://placehold.co/400x250?text=No+Image"}
                      alt={item.title}
                      loading="lazy"
                    />
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