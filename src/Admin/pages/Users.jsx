import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../Firebase/firebase";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import "./style/users.css";

export default function Users() {
  const [showModal, setShowModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "admin",
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setUsers(data);
      },
      (error) => {
        console.error("Error loading users:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  async function changeRole(userId, currentRole) {
    try {
      const newRole =
        currentRole === "superadmin"
          ? "admin"
          : "superadmin";

      await updateDoc(doc(db, "users", userId), {
        role: newRole,
      });

      alert("User role updated successfully!");
    } catch (error) {
      console.error(error);
      alert("Failed to update role.");
    }
  }

  async function handleDeleteUser(userId, userName) {
    if (!window.confirm(`Delete user "${userName}"?`)) return;
    try {
      await deleteDoc(doc(db, "users", userId));
      alert("User removed from database.");
    } catch (error) {
      console.error(error);
      alert("Failed to delete user.");
    }
  }

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      alert("Name and email are required.");
      return;
    }

    setLoading(true);
    try {
      // Create user record in Firestore users collection
      const userDocRef = doc(collection(db, "users"));
      await setDoc(userDocRef, {
        name: formData.name,
        email: formData.email.toLowerCase(),
        role: formData.role,
        createdAt: serverTimestamp(),
      });

      alert(`Admin account created for ${formData.name}!`);
      setShowModal(false);
      setFormData({ name: "", email: "", password: "", role: "admin" });
    } catch (error) {
      console.error(error);
      alert(error.message || "Failed to create user.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Topbar />

        <div className="dashboard-content">
          <div className="users-header">
            <div>
              <h2>Users Management</h2>
              <p>Manage admin accounts and permissions</p>
            </div>

            <button
              className="add-user-btn"
              onClick={() => setShowModal(true)}
            >
              + Add Admin
            </button>
          </div>

          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      style={{
                        textAlign: "center",
                        padding: "30px",
                      }}
                    >
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.name}</td>

                      <td>{user.email}</td>

                      <td>
                        {user.role === "superadmin"
                          ? "Super Admin"
                          : "Admin"}
                      </td>

                      <td>
                        <span className="status active">
                          Active
                        </span>
                      </td>

                      <td style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() =>
                            changeRole(user.id, user.role)
                          }
                          style={{
                            padding: "6px 12px",
                            background: "#3b82f6",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                          }}
                        >
                          Toggle Role
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteUser(user.id, user.name)
                          }
                          style={{
                            padding: "6px 12px",
                            background: "#ef4444",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {showModal && (
            <div className="modal-overlay" onClick={() => setShowModal(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h2>Add New Admin</h2>

                <form onSubmit={handleCreateUser} style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Full Name"
                    required
                    style={{ padding: "10px", background: "#0f172a", border: "1px solid #334155", color: "#fff", borderRadius: "6px" }}
                  />

                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Email Address"
                    required
                    style={{ padding: "10px", background: "#0f172a", border: "1px solid #334155", color: "#fff", borderRadius: "6px" }}
                  />

                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Password (for initial login setup)"
                    style={{ padding: "10px", background: "#0f172a", border: "1px solid #334155", color: "#fff", borderRadius: "6px" }}
                  />

                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    style={{ padding: "10px", background: "#0f172a", border: "1px solid #334155", color: "#fff", borderRadius: "6px" }}
                  >
                    <option value="admin">Admin</option>
                    <option value="superadmin">Super Admin</option>
                  </select>

                  <div className="modal-actions" style={{ marginTop: "12px" }}>
                    <button
                      type="button"
                      className="cancel"
                      onClick={() => setShowModal(false)}
                    >
                      Cancel
                    </button>

                    <button type="submit" className="save" disabled={loading}>
                      {loading ? "Creating..." : "Create User"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}