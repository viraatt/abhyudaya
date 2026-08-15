import { memo } from "react";
import "./BlogCard.css";
import { Link } from "react-router-dom";
import { FiCalendar, FiClock, FiArrowRight, FiUser } from "react-icons/fi";

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
        <h3 className="blog-card-title">
          <Link to={`/blog/${blog.slug}`}>{blog.title}</Link>
        </h3>

        <p className="blog-card-desc">
          {blog.excerpt}
        </p>

        <div className="blog-card-footer">
          <div className="blog-meta">
            {blog.author && (
              <span>
                <FiUser />
                {blog.author}
              </span>
            )}
            {blog.date && (
              <span>
                <FiCalendar />
                {blog.date}
              </span>
            )}
            {blog.readTime && (
              <span>
                <FiClock />
                {blog.readTime}
              </span>
            )}
          </div>

          <Link to={`/blog/${blog.slug}`} className="blog-read-btn" aria-label={`Read ${blog.title}`}>
            <span>Read Article</span>
            <FiArrowRight className="btn-arrow" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default memo(BlogCard);