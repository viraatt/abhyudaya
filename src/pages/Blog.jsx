import { useEffect, useMemo, useState } from "react";
import "./Blog.css";

import SearchBar from "../components/blog/SearchBar";
import CategoryFilter from "../components/blog/CategoryFilter";
import FeaturedPost from "../components/blog/FeaturedPost";
import BlogCard from "../components/blog/BlogCard";

import { db } from "../Firebase/firebase";

import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

const Blog = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      setLoading(true);

      // Fetch only published blogs
      const q = query(
        collection(db, "blogs"),
        where("status", "==", "Published")
      );

      const snapshot = await getDocs(q);

      const blogList = snapshot.docs
        .map((doc) => {
          const data = doc.data();

          return {
            id: doc.id,
            ...data,
            date: data.createdAt?.toDate
              ? data.createdAt.toDate().toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })
              : "Recently",
          };
        })
        .filter(
          (blog) =>
            (blog.status || "").toLowerCase() === "published"
        );

      blogList.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;

        return bTime - aTime;
      });

      setBlogs(blogList);
    } catch (error) {
      console.error("Error loading blogs:", error);
    } finally {
      setLoading(false);
    }
  };

  const featuredBlog = useMemo(() => {
    const featured = blogs.find((blog) => blog.featured);
    return featured || blogs[0];
  }, [blogs]);

  const filteredBlogs = useMemo(() => {
    return blogs.filter((blog) => {
      const categoryMatch =
        activeCategory === "All" ||
        blog.category === activeCategory;

      const searchText = search.toLowerCase();

      const searchMatch =
        blog.title?.toLowerCase().includes(searchText) ||
        blog.excerpt?.toLowerCase().includes(searchText) ||
        blog.author?.toLowerCase().includes(searchText);

      return categoryMatch && searchMatch;
    });
  }, [blogs, activeCategory, search]);

  if (loading) {
    return (
      <section className="blog-page">
        <div className="blog-container">
          <div
            style={{
              padding: "120px 0",
              textAlign: "center",
              fontSize: "22px",
              fontWeight: 600,
            }}
          >
            Loading Blogs...
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="blog-page">
      <div className="blog-container">

        <div className="blog-header">
          <h1>Abhyudaya Blog</h1>

          <p>
            Events, Workshops, Achievements & Stories
          </p>
        </div>

        <SearchBar
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <CategoryFilter
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />

        {featuredBlog && (
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
              <h2>No Blogs Found</h2>

              <p>
                No published blogs are available.
              </p>
            </div>
          )}
        </div>

      </div>
    </section>
  );
};

export default Blog;