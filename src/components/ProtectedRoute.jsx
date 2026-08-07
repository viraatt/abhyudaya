import { Navigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { ROLES } from "../config/roles";

export default function ProtectedRoute({
  children,
  allowedRoles = [],
}) {
  const { currentUser } = useAuth();

  if (currentUser === undefined) {
    return <div>Loading...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/admin/login" replace />;
  }

  if (currentUser.role === ROLES.SUPER_ADMIN) {
    return children;
  }

  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(currentUser.role)
  ) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}