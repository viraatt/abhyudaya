import { Navigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

export default function ProtectedRoute({
  children,
  allowedRoles = [],
}) {
  const { currentUser } = useAuth();

  // Wait until AuthContext finishes loading
  if (currentUser === undefined) {
    return <div>Loading...</div>;
  }

  // User is not logged in
  if (!currentUser) {
    return <Navigate to="/admin/login" replace />;
  }

  // Check role permission
  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(currentUser.role)
  ) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}