import { memo } from "react";
import "./BlogCard.css";
import { Link } from "react-router-dom";

import {
  FiCalendar,
  FiClock,
  FiArrowRight,
  FiUser,
} from "react-icons/fi";

function BlogCard({ blog }) {
  return (
    <article className="blog-card">
      <div className="blog-card-image">
        <img
          src={
            blog.featuredImage ||
            "https://placehold.co/600x400?text=No+Image"
          }
          alt={blog.title}
          loading="lazy"
          decoding="async"
        />

        <span className="blog-category">
          {blog.category || "General"}
        </span>
      </div>

      <div className="blog-card-body">
        <h2 className="blog-card-title">
          {blog.title}
        </h2>

        <p className="blog-card-desc">
          {blog.excerpt}
        </p>

        <div className="blog-meta">
          <span>
            <FiUser />
            {blog.author || "Admin"}
          </span>

          <span>
            <FiCalendar />
            {blog.date || "Recently"}
          </span>

          <span>
            <FiClock />
            {blog.readTime || "5 min read"}
          </span>
        </div>

        <Link
          to={`/blog/${blog.slug}`}
          className="blog-read-btn"
        >
          Read Article
          <FiArrowRight />
        </Link>
      </div>
    </article>
  );
}

export default memo(BlogCard);