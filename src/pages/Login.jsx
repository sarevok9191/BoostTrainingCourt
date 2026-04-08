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

        {/* ── Social links ── */}
        <div className="login-social">
          <a
            href="https://www.instagram.com/boosttrainingcourt"
            target="_blank"
            rel="noopener noreferrer"
            className="social-link social-instagram"
            aria-label="Instagram"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <circle cx="12" cy="12" r="4"/>
              <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
            </svg>
          </a>
          <a
            href="https://www.youtube.com/@boosttrainingcourt"
            target="_blank"
            rel="noopener noreferrer"
            className="social-link social-youtube"
            aria-label="YouTube"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.96A29 29 0 0023 12a29 29 0 00-.46-5.58z"/>
              <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
