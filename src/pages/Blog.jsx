import { useEffect, useMemo, useState, useCallback } from "react";
import "./Blog.css";

import SearchBar from "../components/blog/SearchBar";
import CategoryFilter from "../components/blog/CategoryFilter";
import FeaturedPost from "../components/blog/FeaturedPost";
import BlogCard from "../components/blog/BlogCard";
import { getBlogsPage } from "../Firebase/blogService";

const Blog = () => {
  const [blogs, setBlogs] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const fetchInitialBlogs = useCallback(async (cat) => {
    try {
      setLoading(true);
      const res = await getBlogsPage({
        pageSize: 6,
        category: cat,
        onlyPublished: true,
      });
      setBlogs(res.blogs);
      setLastDoc(res.lastDoc);
      setHasMore(res.hasMore);
    } catch (error) {
      console.error("Error loading blogs:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialBlogs(activeCategory);
  }, [activeCategory, fetchInitialBlogs]);

  const handleLoadMore = async () => {
    if (!hasMore || loadingMore || !lastDoc) return;
    try {
      setLoadingMore(true);
      const res = await getBlogsPage({
        pageSize: 6,
        lastDoc,
        category: activeCategory,
        onlyPublished: true,
      });
      setBlogs((prev) => [...prev, ...res.blogs]);
      setLastDoc(res.lastDoc);
      setHasMore(res.hasMore);
    } catch (error) {
      console.error("Error loading more blogs:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const featuredBlog = useMemo(() => {
    const featured = blogs.find((blog) => blog.featured);
    return featured || blogs[0];
  }, [blogs]);

  // Client-side search performed in-memory on loaded data (no Firestore query per keystroke)
  const filteredBlogs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return blogs;

    return blogs.filter((blog) => {
      return (
        (blog.title || "").toLowerCase().includes(query) ||
        (blog.excerpt || "").toLowerCase().includes(query) ||
        (blog.author || "").toLowerCase().includes(query)
      );
    });
  }, [blogs, search]);

  return (
    <div className="blog-page">
      {/* ---------- HERO ---------- */}
      <section className="blog-header">
        <div className="blog-badge">
          <svg
            className="blog-badge-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {/* Feather pen-nib — signals writing/blogging */}
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          <span className="blog-badge-text">Abhyudaya Club</span>
        </div>

        <h1 className="blog-title">
          Explore Our <span>Stories</span>
        </h1>

        <p className="blog-subtitle">
          Discover inspiring articles, technical insights,
          workshops, competitions, achievements and exciting
          moments from the Abhyudaya Club community.
        </p>
      </section>

      <SearchBar
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <CategoryFilter
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      {loading ? (
        <div className="blog-loading">
          Loading blogs...
        </div>
      ) : (
        <>
          {featuredBlog && !search && (
            <FeaturedPost blog={featuredBlog} />
          )}

          <div className="blog-grid">
            {filteredBlogs.length > 0 ? (
              filteredBlogs.map((blog) => (
                <BlogCard
                  key={blog.id}
                  blog={blog}
                />
              ))
            ) : (
              <div className="no-blogs">
                No blogs found.
              </div>
            )}
          </div>

          {hasMore && !search && (
            <div className="load-more-container">
              <button
                type="button"
                className="load-more-btn"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading..." : "Load More Stories"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Blog;