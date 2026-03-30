import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// allowedRoles: string[] — leave undefined to allow any authenticated user
export default function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, userRole } = useAuth();

  if (!currentUser) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
