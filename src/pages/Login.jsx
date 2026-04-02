import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage, LangToggle } from "../contexts/LanguageContext";

const ROLE_ROUTES = {
  superadmin: "/superadmin/dashboard",
  trainer:    "/trainer/dashboard",
  trainee:    "/trainee/dashboard",
};

export default function Login() {
  const { login }  = useAuth();
  const { t }      = useLanguage();
  const navigate   = useNavigate();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const role = await login(email, password);
      navigate(ROLE_ROUTES[role] || "/login", { replace: true });
    } catch (err) {
      setError(err.message || t("signInError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrapper">
      <LangToggle />
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-mark">BT</div>
        </div>
        <h1 className="login-brand">Boost Training Court</h1>
        <p className="login-sub">{t("signInSub")}</p>

        {error && <div className="alert-error" style={{ marginBottom: "1rem" }}>{error}</div>}

        <form onSubmit={handleSubmit} noValidate className="login-form">
          <div className="form-group">
            <label htmlFor="email">{t("email")}</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">{t("password")}</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? t("signingIn") : t("signIn")}
          </button>
        </form>
      </div>
    </div>
  );
}
