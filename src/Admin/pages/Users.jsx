import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../Firebase/firebase";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import "./style/users.css";

export default function Users() {
  const [showModal, setShowModal] = useState(false);
  const [users, setUsers] = useState([]);

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

                      <td>
                        <button
                          onClick={() =>
                            changeRole(user.id, user.role)
                          }
                        >
                          Change Role
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {showModal && (
            <div className="modal-overlay">
              <div className="modal">
                <h2>Add New Admin</h2>

                <input
                  type="text"
                  placeholder="Full Name"
                />

                <input
                  type="email"
                  placeholder="Email"
                />

                <input
                  type="password"
                  placeholder="Password"
                />

                <select>
                  <option value="admin">Admin</option>
                  <option value="superadmin">
                    Super Admin
                  </option>
                </select>

                <div className="modal-actions">
                  <button
                    className="cancel"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>

                  <button className="save">
                    Create User
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}