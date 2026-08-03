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
  src={
    blog.featuredImage
      ? blog.featuredImage.replace(
          "/upload/",
          "/upload/c_fill,w_1600,h_700,q_auto,f_auto/"
        )
      : "https://placehold.co/1600x700?text=No+Image"
  }
  alt={blog.title}
  loading="lazy"
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