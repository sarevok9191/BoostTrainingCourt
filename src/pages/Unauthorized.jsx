import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Unauthorized() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <h2>Access Denied</h2>
        <p>You don&apos;t have permission to view this page.</p>
        <button onClick={handleLogout} style={{ marginTop: "1rem" }}>
          Back to Login
        </button>
      </div>
    </div>
  );
}
