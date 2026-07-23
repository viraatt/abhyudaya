import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "./BlogDetails.css";

import { db } from "../Firebase/firebase";
import { doc, getDoc } from "firebase/firestore";

import {
  FiArrowLeft,
  FiCalendar,
  FiClock,
  FiUser,
} from "react-icons/fi";

export default function BlogDetails() {
  const { id } = useParams();

  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const blogRef = doc(db, "blogs", id);

        const blogSnap = await getDoc(blogRef);

        if (blogSnap.exists()) {
          const data = blogSnap.data();

          setBlog({
            id: blogSnap.id,
            ...data,
            date: data.createdAt?.toDate
              ? data.createdAt
                  .toDate()
                  .toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })
              : "Recently",
          });
        } else {
          setBlog(null);
        }
      } catch (error) {
        console.error(error);
        setBlog(null);
      } finally {
        setLoading(false);
      }
    };

    fetchBlog();
  }, [id]);

  if (loading) {
    return (
      <section className="blog-details">
        <div className="blog-details-container">
          <h2>Loading Blog...</h2>
        </div>
      </section>
    );
  }

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
    <section className="blog-details">
      <div className="blog-details-container">

        <Link
          to="/blog"
          className="back-btn"
        >
          <FiArrowLeft />
          Back to Blog
        </Link>

        <img
          src={blog.image}
          alt={blog.title}
          className="details-image"
        />

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

        <div className="details-content">
          {blog.content}
        </div>

      </div>
    </section>
  );
}