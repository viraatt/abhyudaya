import { Link } from "react-router-dom";
import "./blogs.css";

export default function Blogs() {
  const blogs = [
    {
      id: 1,
      title: "AI Workshop at MPEC",
      category: "Technology",
      author: "Admin",
      status: "Published",
      date: "22 Jul 2026",
    },
    {
      id: 2,
      title: "Science Exhibition",
      category: "Events",
      author: "Admin",
      status: "Draft",
      date: "20 Jul 2026",
    },
  ];

  return (
    <div className="blogs-page">
      <div className="blogs-header">
        <div>
          <h1>Blog Manager</h1>
          <p>Manage blog posts for the Abhyudaya website.</p>
        </div>

        <Link
          to="/admin/blogs/add"
          className="add-blog-btn"
        >
          + Add Blog
        </Link>
      </div>

      <div className="table-wrapper">
        <table className="blogs-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Author</th>
              <th>Status</th>
              <th>Date</th>
              <th width="180">Actions</th>
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
                        ? "status published"
                        : "status draft"
                    }
                  >
                    {blog.status}
                  </span>
                </td>

                <td>{blog.date}</td>

                <td>
                  <button className="edit-btn">
                    Edit
                  </button>

                  <button className="delete-btn">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}