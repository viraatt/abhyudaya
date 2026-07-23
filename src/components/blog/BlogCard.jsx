import "./BlogCard.css";
import { Link } from "react-router-dom";

import {
  FiCalendar,
  FiClock,
  FiArrowRight,
  FiUser,
} from "react-icons/fi";

export default function BlogCard({ blog }) {
  return (
    <article className="blog-card">
      <div className="blog-card-image">
        <img src={blog.image} alt={blog.title} />

        <span className="blog-category">
          {blog.category}
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
          className="blog-read-btn"
        >
          Read Article
          <FiArrowRight />
        </Link>
      </div>
    </article>
  );
}