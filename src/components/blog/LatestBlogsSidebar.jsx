/**
 * LatestBlogsSidebar.jsx
 * Shows the 3 most recent published blog posts as a "You may also like" section.
 * Used at the bottom of BlogDetails to improve internal linking & crawl depth.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getBlogsPage } from "../../Firebase/blogService";
import "./LatestBlogsSidebar.css";

export default function LatestBlogsSidebar({ currentSlug }) {
  const [blogs, setBlogs] = useState([]);

  useEffect(() => {
    async function fetchLatest() {
      try {
        const res = await getBlogsPage({ pageSize: 4, onlyPublished: true });
        const filtered = res.blogs.filter(
          (b) => b.slug !== currentSlug && b.id !== currentSlug
        );
        setBlogs(filtered.slice(0, 3));
      } catch (err) {
        // Silently skip sidebar on error
      }
    }
    fetchLatest();
  }, [currentSlug]);

  if (!blogs.length) return null;

  return (
    <aside className="latest-blogs-sidebar" aria-label="Latest articles">
      <h2 className="latest-blogs-sidebar__title">Latest Articles</h2>
      <ul className="latest-blogs-sidebar__list">
        {blogs.map((blog) => (
          <li key={blog.id} className="latest-blogs-sidebar__item">
            <Link
              to={`/blog/${blog.slug || blog.id}`}
              className="latest-blogs-sidebar__link"
            >
              {blog.featuredImage && (
                <img
                  src={blog.featuredImage}
                  alt={blog.title}
                  className="latest-blogs-sidebar__img"
                  loading="lazy"
                  decoding="async"
                  width="80"
                  height="60"
                />
              )}
              <div className="latest-blogs-sidebar__text">
                <span className="latest-blogs-sidebar__category">
                  {blog.category}
                </span>
                <p className="latest-blogs-sidebar__name">{blog.title}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <Link to="/blog" className="latest-blogs-sidebar__all">
        View all articles →
      </Link>
    </aside>
  );
}
