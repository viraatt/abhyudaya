import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../../Firebase/firebase";

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const [user, setUser] = useState(undefined);
  const [role, setRole] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setRole(null);
        return;
      }

      setUser(currentUser);

      try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setRole(userSnap.data().role || null);
        } else {
          setRole(null);
        }
      } catch (err) {
        console.error("[ProtectedRoute] role fetch error:", err);
        setRole(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Firebase auth check hone tak loading dikhao
  if (user === undefined) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "20px",
          fontWeight: "bold",
        }}
      >
        Loading...
      </div>
    );
  }

  // Login nahi hai to login page par bhej do
  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  // Role check: if allowedRoles is specified, enforce it
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    // Authenticated but unauthorized → safe redirect to dashboard
    return <Navigate to="/admin/dashboard" replace />;
  }

  // Login hai aur role allowed hai to page dikhao
  return children;
}