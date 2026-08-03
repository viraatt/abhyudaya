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
              ? data.createdAt
                  .toDate()
                  .toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })
              : "Recently",
          };
        })
        .filter(
          (blog) =>
            (blog.status || "").toLowerCase() ===
            "published"
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
        (blog.category || "") === activeCategory;

      const searchMatch =
        search.trim() === "" ||
        (blog.title || "")
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        (blog.excerpt || "")
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        (blog.author || "")
          .toLowerCase()
          .includes(search.toLowerCase());

      return categoryMatch && searchMatch;
    });
  }, [blogs, activeCategory, search]);

  return (
    <div className="blog-page">

      <div className="blog-header">
        <h1>Our Blogs</h1>
        <p>
          Explore articles, events, achievements,
          technology and more from Abhyudaya Club.
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

      {loading ? (
        <div className="blog-loading">
          Loading blogs...
        </div>
      ) : (
        <>
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
                No blogs found.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Blog;