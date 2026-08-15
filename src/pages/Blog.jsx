import { useEffect, useMemo, useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import "./Blog.css";

import SearchBar from "../components/blog/SearchBar";
import CategoryFilter from "../components/blog/CategoryFilter";
import BlogCard from "../components/blog/BlogCard";
import CollectionPageSchema from "../components/seo/schemas/CollectionPageSchema";
import { getBlogsPage } from "../Firebase/blogService";

const SITE_URL = "https://www.abhyudayaclub.in";

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
        pageSize: 9,
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

  // Client-side search performed in-memory on loaded data
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

  const handleResetFilters = () => {
    setSearch("");
    setActiveCategory("All");
  };

  return (
    <div className="blog-page">
      {/* ====== SEO ====== */}
      <Helmet>
        <title>Blog | Abhyudaya Club — Stories, Insights & Event Reports</title>
        <meta
          name="description"
          content="Ideas, stories, events, and insights from the Abhyudaya Club community."
        />
        <link rel="canonical" href={`${SITE_URL}/blog`} />
        <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Abhyudaya Club" />
        <meta property="og:title" content="Blog | Abhyudaya Club — Stories, Insights & Event Reports" />
        <meta property="og:description" content="Ideas, stories, events, and insights from the Abhyudaya Club community." />
        <meta property="og:url" content={`${SITE_URL}/blog`} />
        <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
        <meta property="og:locale" content="en_IN" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Blog | Abhyudaya Club — Stories, Insights & Event Reports" />
        <meta name="twitter:description" content="Ideas, stories, events, and insights from the Abhyudaya Club community." />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.png`} />
      </Helmet>

      {/* CollectionPage JSON-LD */}
      <CollectionPageSchema blogs={blogs} />

      <div className="blog-container">
        {/* ---------- COMPACT EDITORIAL HEADER ---------- */}
        <header className="blog-header">
          <div className="blog-eyebrow">
            <span className="blog-eyebrow-accent" />
            <span>ABHYUDAYA JOURNAL</span>
          </div>

          <h1 className="blog-title">Blog</h1>

          <p className="blog-subtitle">
            Ideas, stories, events, and insights from the Abhyudaya community.
          </p>
        </header>

        {/* ---------- CONTROLS SECTION ---------- */}
        <div className="blog-controls">
          <SearchBar
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch("")}
          />

          <CategoryFilter
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        </div>

        {/* ---------- CONTENT GRID ---------- */}
        {loading ? (
          <div className="blog-loading">
            <div className="blog-loading-spinner" />
            <span>Loading articles...</span>
          </div>
        ) : (
          <>
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
                  <h3>No articles found</h3>
                  <p>We couldn't find any articles matching your search or category selection.</p>
                  {(search || activeCategory !== "All") && (
                    <button
                      type="button"
                      className="reset-search-btn"
                      onClick={handleResetFilters}
                    >
                      Clear search & filters
                    </button>
                  )}
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
                  {loadingMore ? "Loading..." : "Load More Articles"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Blog;