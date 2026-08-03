import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import "./BlogDetails.css";

import { db } from "../Firebase/firebase";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  onSnapshot,
  query,
  orderBy,
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

export default function BlogDetails() {
  const { id } = useParams();

  // ==========================
  // STATES
  // ==========================

  const [blog, setBlog] = useState(null);
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

  const currentUrl = window.location.href;

  const shareText = blog
    ? `${blog.title} | Abhyudaya Club`
    : "Abhyudaya Club Blog";

  // ==========================
  // SHARE
  // ==========================

  const shareWhatsapp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(
        `${shareText}\n${currentUrl}`
      )}`,
      "_blank"
    );
  };

  const shareLinkedin = () => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
        currentUrl
      )}`,
      "_blank"
    );
  };

  const shareTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        shareText
      )}&url=${encodeURIComponent(currentUrl)}`,
      "_blank"
    );
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);

    } catch (error) {
      console.error(error);
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

    try {

      setPosting(true);

      const commentsRef = collection(db, "blogs", id, "comments");

console.log("Writing to:", commentsRef.path);

await addDoc(commentsRef, {
          name: trimmedName,
          message: trimmedMessage,
          createdAt: serverTimestamp(),
        }
      );

      setName("");
      setMessage("");

      setCooldown(30);

    } catch (error) {

      console.error(error);

      alert(error.message);

    } finally {

      setPosting(false);

    }

  };
    // ==========================
  // FETCH BLOG
  // ==========================

  useEffect(() => {

    const fetchBlog = async () => {

      try {

        const blogRef = doc(db, "blogs", id);
        const blogSnap = await getDoc(blogRef);

        if (!blogSnap.exists()) {
          setBlog(null);
          setLoading(false);
          return;
        }

        const data = blogSnap.data();

        const currentBlog = {
          id: blogSnap.id,
          ...data,
          date: data.createdAt?.toDate
            ? data.createdAt.toDate().toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })
            : "Recently",
        };

       console.log(currentBlog);
setBlog(currentBlog);
        // Related Blogs

        const blogsSnapshot = await getDocs(collection(db, "blogs"));

        const related = blogsSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((item) => item.id !== id)
          .slice(0, 3);

        setRelatedBlogs(related);

      } catch (error) {

        console.error(error);
        setBlog(null);

      } finally {

        setLoading(false);

      }

    };

    fetchBlog();

  }, [id]);



  // ==========================
  // READING PROGRESS
  // ==========================

  useEffect(() => {

    const handleScroll = () => {

      const totalHeight =
        document.documentElement.scrollHeight -
        window.innerHeight;

      const progress =
        totalHeight > 0
          ? (window.scrollY / totalHeight) * 100
          : 0;

      setScrollProgress(progress);

    };

    window.addEventListener("scroll", handleScroll);

    return () =>
      window.removeEventListener("scroll", handleScroll);

  }, []);



  // ==========================
  // LOAD COMMENTS
  // ==========================

  useEffect(() => {

    if (!id) return;

    const commentsRef = collection(
      db,
      "blogs",
      id,
      "comments"
    );

    const q = query(
      commentsRef,
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {

        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setComments(data);

      },
      (error) => {
        console.error(error);
      }
    );

    return () => unsubscribe();

  }, [id]);



  // ==========================
  // COOLDOWN TIMER
  // ==========================

  useEffect(() => {

    if (cooldown <= 0) return;

    const timer = setInterval(() => {

      setCooldown((prev) => prev - 1);

    }, 1000);

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

          <Link
            to="/blog"
            className="back-btn"
          >
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

      <title>
        {blog.title} | Abhyudaya Club
      </title>

      <meta
        name="description"
        content={(blog.content || "")
          .replace(/<[^>]+>/g, "")
          .slice(0, 160)}
      />

      <meta
        name="keywords"
        content={`${blog.category}, ${blog.title}, Abhyudaya Club, MPEC`}
      />

      <meta
        property="og:title"
        content={blog.title}
      />

      <meta
        property="og:description"
        content={(blog.content || "")
          .replace(/<[^>]+>/g, "")
          .slice(0, 160)}
      />

      <meta
        property="og:image"
        content={blog.image}
      />

      <meta
        property="og:url"
        content={currentUrl}
      />

      <meta
        property="og:type"
        content="article"
      />

      <meta
        name="twitter:card"
        content="summary_large_image"
      />

      <meta
        name="twitter:title"
        content={blog.title}
      />

      <meta
        name="twitter:image"
        content={blog.image}
      />

    </Helmet>

    <section className="blog-details">

      {/* Reading Progress */}

      <div
        className="reading-progress"
        style={{
          width: `${scrollProgress}%`,
        }}
      />

      <div className="blog-details-container">

      <div className="blog-top">

  <Link
    to="/blog"
    className="back-btn"
  >
    <FiArrowLeft />
    Back to Blog
  </Link>

</div>

<span className="details-category">
  {blog.category}
</span>

        <h1>{blog.title}</h1>

        <div className="details-meta">

          <span>
            <FiUser />
            {blog.author}
          </span>

          <span>
            <FiCalendar />
            {blog.date}
          </span>

          <span>
            <FiClock />
            {blog.readTime}
          </span>

        </div>

        {/* Share Buttons */}

        <div className="share-section">

          <h3>Share this article</h3>

          <div className="share-buttons">

            <button
              className="share-btn whatsapp"
              onClick={shareWhatsapp}
            >
              <FaWhatsapp />
              WhatsApp
            </button>

            <button
              className="share-btn linkedin"
              onClick={shareLinkedin}
            >
              <FaLinkedin />
              LinkedIn
            </button>

            <button
              className="share-btn twitter"
              onClick={shareTwitter}
            >
              <FaXTwitter />
              X
            </button>

            <button
              className="share-btn copy"
              onClick={copyLink}
            >
              <FiCopy />
              {copied ? "Copied!" : "Copy Link"}
            </button>

          </div>

        </div>

        {/* Blog Content */}

        <div
          className="details-content"
          dangerouslySetInnerHTML={{
            __html: blog.content || "",
          }}
        />

        {/* COMMENTS START */}

        <div className="comments-section">

          <h2>Leave a Comment</h2>

          <div className="comment-form">

            <input
              type="text"
              placeholder="Your Name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
            />

            <textarea
              rows="5"
              placeholder="Write your comment..."
              value={message}
              onChange={(e) =>
                setMessage(e.target.value)
              }
            />

            <button
              onClick={submitComment}
              disabled={
                posting || cooldown > 0
              }
            >
              {posting
                ? "Posting..."
                : cooldown > 0
                ? `Wait ${cooldown}s`
                : "Post Comment"}
            </button>

          </div>
                    {/* ===========================
              COMMENTS LIST
          =========================== */}

          <div className="comments-list">

            <h2>
              Comments ({comments.length})
            </h2>

            {comments.length === 0 ? (

              <div className="no-comments">
                No comments yet. Be the first to comment!
              </div>

            ) : (

              comments.map((comment) => (

                <div
                  key={comment.id}
                  className="comment-card"
                >

                  <div className="comment-header">

                    <div className="comment-avatar">
                      {comment.name?.charAt(0).toUpperCase()}
                    </div>

                    <div>

                      <h4>{comment.name}</h4>

                      <span>
                        {comment.createdAt?.toDate
                          ? comment.createdAt
                              .toDate()
                              .toLocaleString()
                          : "Just now"}
                      </span>

                    </div>

                  </div>

                  <p className="comment-message">
                    {comment.message}
                  </p>

                </div>

              ))

            )}

                </div>   {/* comments-list */}

        </div>     {/* comments-section */}

        <hr className="blog-divider" />
          {/* ===========================
              RELATED ARTICLES
          =========================== */}

          <div className="related-section">

            <h2>Related Articles</h2>

            <div className="related-grid">

              {relatedBlogs.length > 0 ? (

                relatedBlogs.map((item) => (

                  <Link
                    key={item.id}
                    to={`/blog/${item.id}`}
                    className="related-card"
                  >

                    <img
                      src={item.image}
                      alt={item.title}
                    />

                    <div className="related-body">

                      <span>{item.category}</span>

                      <h3>{item.title}</h3>

                      <p>
                        {(item.content || "")
                          .replace(/<[^>]*>/g, "")
                          .slice(0, 100)}
                        ...
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