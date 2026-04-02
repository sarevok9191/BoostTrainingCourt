import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage, LangToggle } from "../contexts/LanguageContext";

export default function Unauthorized() {
  const { logout } = useAuth();
  const { t }      = useLanguage();
  const navigate   = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="login-wrapper">
      <LangToggle />
      <div className="login-card">
        <h2>{t("accessDenied")}</h2>
        <p>{t("youDontHavePermission")}</p>
        <button onClick={handleLogout} style={{ marginTop: "1rem" }}>
          {t("backToLogin")}
        </button>
      </div>
    </div>
  );
}
