import { Link } from "react-router-dom";
import "./blogs.css";

const stats = [
  { title: "Total Blogs", value: 18 },
  { title: "Published", value: 12 },
  { title: "Drafts", value: 6 },
  { title: "Categories", value: 5 },
];

const blogs = [
  {
    id: 1,
    title: "AI in Modern Education",
    category: "Technology",
    author: "Admin",
    status: "Published",
    date: "22 Jul 2026",
  },
  {
    id: 2,
    title: "Science Exhibition 2026",
    category: "Events",
    author: "Admin",
    status: "Draft",
    date: "20 Jul 2026",
  },
];

export default function Blogs() {
  return (
    <div className="blogs-page">

      <div className="blogs-header">
        <div>
          <h1>📝 Blog Manager</h1>
          <p>Manage all blog posts for the Abhyudaya website.</p>
        </div>

        <Link to="/admin/blogs/add" className="add-blog-btn">
          + New Blog
        </Link>
      </div>

      <div className="stats-grid">
        {stats.map((item) => (
          <div className="stat-card" key={item.title}>
            <h2>{item.value}</h2>
            <p>{item.title}</p>
          </div>
        ))}
      </div>

      <div className="table-card">

        <div className="table-top">
          <input
            type="text"
            placeholder="🔍 Search blogs..."
          />
        </div>

        <table>

          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Author</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>

            {blogs.map((blog) => (
              <tr key={blog.id}>

                <td>{blog.title}</td>

                <td>{blog.category}</td>

                <td>{blog.author}</td>

                <td>
                  <span
                    className={
                      blog.status === "Published"
                        ? "published"
                        : "draft"
                    }
                  >
                    {blog.status}
                  </span>
                </td>

                <td>{blog.date}</td>

                <td>
                  <button className="edit-btn">✏ Edit</button>
                  <button className="delete-btn">🗑 Delete</button>
                </td>

              </tr>
            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}