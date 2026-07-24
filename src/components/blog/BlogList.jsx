import "./BlogList.css";

const demoPosts = [
  {
    id: 1,
    title: "PR AND CREATIVE TEAM",
    category: "Club",
    status: "Published",
    date: "23 Jul 2026",
    image: "https://placehold.co/100x70",
  },
  {
    id: 2,
    title: "Photography Workshop",
    category: "Workshop",
    status: "Draft",
    date: "20 Jul 2026",
    image: "https://placehold.co/100x70",
  },
  {
    id: 3,
    title: "Freshers Orientation",
    category: "Event",
    status: "Published",
    date: "18 Jul 2026",
    image: "https://placehold.co/100x70",
  },
];

function BlogList() {
  return (
    <div className="blog-page">

      <div className="blog-header">

        <div>
          <h1>Blog Posts</h1>
          <p>Manage all blog articles</p>
        </div>

        <button className="new-post-btn">
          + New Post
        </button>

      </div>

      <div className="blog-filters">

        <input
          type="text"
          placeholder="Search posts..."
        />

        <select>
          <option>All Categories</option>
          <option>Club</option>
          <option>Workshop</option>
          <option>Event</option>
        </select>

        <select>
          <option>All Status</option>
          <option>Published</option>
          <option>Draft</option>
        </select>

      </div>

      <table className="blog-table">

        <thead>
          <tr>
            <th>Thumbnail</th>
            <th>Title</th>
            <th>Category</th>
            <th>Status</th>
            <th>Date</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>

          {demoPosts.map((post) => (

            <tr key={post.id}>

              <td>
                <img
                  src={post.image}
                  alt={post.title}
                />
              </td>

              <td>{post.title}</td>

              <td>{post.category}</td>

              <td>

                <span
                  className={
                    post.status === "Published"
                      ? "status published"
                      : "status draft"
                  }
                >
                  {post.status}
                </span>

              </td>

              <td>{post.date}</td>

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
  );
}

export default BlogList;