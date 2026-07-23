import "./FeaturedPost.css";
import { Link } from "react-router-dom";
import {
  FiCalendar,
  FiClock,
  FiArrowRight,
  FiUser,
} from "react-icons/fi";

export default function FeaturedPost({ blog }) {
  if (!blog) return null;

  return (
    <section className="featured-post">
      <img
        src={blog.image}
        alt={blog.title}
      />

      <div className="featured-overlay"></div>

      <div className="featured-content">
        <span className="featured-badge">
          ⭐ Featured Story
        </span>

        <h1 className="featured-title">
          {blog.title}
        </h1>

        <p className="featured-description">
          {blog.excerpt}
        </p>

        <div className="featured-meta">
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

        <Link
          to={`/blog/${blog.id}`}
          className="featured-btn"
        >
          Read Article
          <FiArrowRight />
        </Link>
      </div>
    </section>
  );
}