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

      <div className="featured-image">

        <img
          src={
            blog.featuredImage
              ? blog.featuredImage.replace(
                  "/upload/",
                  "/upload/c_fill,w_1600,h_850,q_auto,f_auto/"
                )
              : "https://placehold.co/1600x850?text=No+Image"
          }
          alt={blog.title}
        />

        <div className="featured-overlay"></div>

      </div>

      <div className="featured-content">

        <span className="featured-category">
          {blog.category || "Featured"}
        </span>

        <h1>
          {blog.title}
        </h1>

        <p>
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
  to={`/blog/${blog.slug}`}
  className="featured-btn"
>
          Read Full Article
          <FiArrowRight />
        </Link>

      </div>

    </section>
  );
}