import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import { createUserAccount, deleteUserAccount } from "../firebase/userManagement";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage, LangToggle } from "../contexts/LanguageContext";
import Modal from "../components/Modal";
import BottomNav from "../components/BottomNav";

// Tab label keys (translated by BottomNav via useLanguage)
const TABS = [
  { key: "home",     label: "home",     icon: "home"     },
  { key: "trainers", label: "trainers", icon: "trainers" },
  { key: "trainees", label: "trainees", icon: "trainees" },
  { key: "more",     label: "more",     icon: "more"     },
];

function CreditBadge({ credits }) {
  const n   = credits ?? 0;
  const cls = n > 5 ? "green" : n > 0 ? "amber" : "red";
  return <span className={`credit-badge ${cls}`}>{n}</span>;
}

export default function SuperAdminDashboard() {
  const { currentUser, logout } = useAuth();
  const { t }                   = useLanguage();
  const navigate                = useNavigate();

  const [tab,       setTab]       = useState("home");
  const [trainers,  setTrainers]  = useState([]);
  const [trainees,  setTrainees]  = useState([]);
  const [loading,   setLoading]   = useState(true);

  // Add-trainer modal
  const [showAdd,    setShowAdd]    = useState(false);
  const [addForm,    setAddForm]    = useState({ displayName: "", email: "", password: "" });
  const [addError,   setAddError]   = useState("");
  const [addLoading, setAddLoading] = useState(false);

  // Delete confirm
  const [delTarget,        setDelTarget]        = useState(null);
  const [delLoading,       setDelLoading]       = useState(false);
  const [delConfirmChecked, setDelConfirmChecked] = useState(false);

  // Reset checkbox every time a new target is selected
  useEffect(() => { setDelConfirmChecked(false); }, [delTarget]);

  // ── Firestore listeners ─────────────────────────────────────────
  useEffect(() => {
    const u1 = onSnapshot(
      query(collection(db, "users"), where("role", "==", "trainer")),
      (s) => setTrainers(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const u2 = onSnapshot(
      query(collection(db, "users"), where("role", "==", "trainee")),
      (s) => { setTrainees(s.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); }
    );
    return () => { u1(); u2(); };
  }, []);

  // ── Handlers ───────────────────────────────────────────────────
  async function handleAddTrainer(e) {
    e.preventDefault();
    setAddError("");
    setAddLoading(true);
    try {
      await createUserAccount({ ...addForm, role: "trainer" });
      setShowAdd(false);
      setAddForm({ displayName: "", email: "", password: "" });
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAddLoading(false);
    }
  }

  async function handleDelete() {
    if (!delTarget) return;
    setDelLoading(true);
    try {
      // Delete all trainees belonging to this trainer first
      const trainerTrainees = trainees.filter((tr) => tr.trainerId === delTarget.id);
      for (const trainee of trainerTrainees) {
        await deleteUserAccount(trainee.id);
      }
      // Then delete the trainer
      await deleteUserAccount(delTarget.id);
      setDelTarget(null);
      setDelConfirmChecked(false);
    } catch (err) {
      alert(t("error") + ": " + err.message);
    } finally {
      setDelLoading(false);
    }
  }

  async function handleLogout() { await logout(); navigate("/login", { replace: true }); }

  const traineeCountFor = (tid) => trainees.filter((tr) => tr.trainerId === tid).length;

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="app-shell">
      <LangToggle />
      <main className="dash-main">

        {/* ══════════ HOME ══════════ */}
        {tab === "home" && (
          <>
            <div className="home-greeting">
              <div className="greeting-hello">{t("dashboard")}</div>
              <div className="greeting-name">Boost Training Court</div>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-icon">🏋️</span>
                <span className="stat-value">{trainers.length}</span>
                <span className="stat-label">{t("totalTrainers")}</span>
              </div>
              <div className="stat-card">
                <span className="stat-icon">👤</span>
                <span className="stat-value">{trainees.length}</span>
                <span className="stat-label">{t("totalTrainees")}</span>
              </div>
              <div className="stat-card accent">
                <span className="stat-icon">✅</span>
                <span className="stat-value">{trainers.length + trainees.length + 1}</span>
                <span className="stat-label">{t("activeAccounts")}</span>
              </div>
              <div className="stat-card">
                <span className="stat-icon">📊</span>
                <span className="stat-value">
                  {trainers.length > 0 ? (trainees.length / trainers.length).toFixed(1) : "—"}
                </span>
                <span className="stat-label">{t("traineesPerTrainer")}</span>
              </div>
            </div>

            {trainers.length > 0 && (
              <section className="section-card">
                <div className="section-header">
                  <h2>{t("trainerOverview")}</h2>
                  <span className="role-badge badge-superadmin">{t("superAdminRole")}</span>
                </div>
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead><tr><th>{t("name")}</th><th>{t("traineesCol")}</th></tr></thead>
                    <tbody>
                      {trainers.map((tr) => (
                        <tr key={tr.id}>
                          <td>
                            <div className="cell-name">
                              <span className="avatar">{(tr.displayName || tr.email)[0].toUpperCase()}</span>
                              {tr.displayName || tr.email}
                            </div>
                          </td>
                          <td><span className="count-badge">{traineeCountFor(tr.id)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}

        {/* ══════════ TRAINERS ══════════ */}
        {tab === "trainers" && (
          <section className="section-card">
            <div className="section-header">
              <h2>{t("trainers")}</h2>
              <button className="btn-primary" onClick={() => { setAddError(""); setShowAdd(true); }}>
                {t("addTrainer")}
              </button>
            </div>

            {loading ? (
              <p className="placeholder-text">{t("loading")}</p>
            ) : trainers.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">🏋️</span>
                <p>{t("noTrainersYet")}</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t("name")}</th>
                      <th>{t("emailLabel")}</th>
                      <th>{t("traineesCol")}</th>
                      <th>{t("createdCol")}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainers.map((tr) => (
                      <tr key={tr.id}>
                        <td>
                          <div className="cell-name">
                            <span className="avatar">{(tr.displayName || tr.email)[0].toUpperCase()}</span>
                            {tr.displayName || "—"}
                          </div>
                        </td>
                        <td className="cell-muted">{tr.email}</td>
                        <td><span className="count-badge">{traineeCountFor(tr.id)}</span></td>
                        <td className="cell-muted">
                          {tr.createdAt?.toDate
                            ? tr.createdAt.toDate().toLocaleDateString()
                            : tr.createdAt ? new Date(tr.createdAt).toLocaleDateString() : "—"}
                        </td>
                        <td>
                          <button className="btn-danger-sm" onClick={() => setDelTarget(tr)}>
                            {t("delete")}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ══════════ TRAINEES ══════════ */}
        {tab === "trainees" && (
          <section className="section-card">
            <div className="section-header"><h2>{t("allTrainees")}</h2></div>
            {trainees.length === 0 ? (
              <p className="placeholder-text">{t("noTraineesYetAdmin")}</p>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t("name")}</th>
                      <th>{t("emailLabel")}</th>
                      <th>{t("trainer")}</th>
                      <th>{t("credits")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainees.map((tr) => {
                      const trainer = trainers.find((r) => r.id === tr.trainerId);
                      return (
                        <tr key={tr.id}>
                          <td>
                            <div className="cell-name">
                              <span className="avatar avatar-sm">
                                {(tr.displayName || tr.email)[0].toUpperCase()}
                              </span>
                              {tr.displayName || "—"}
                            </div>
                          </td>
                          <td className="cell-muted">{tr.email}</td>
                          <td className="cell-muted">{trainer?.displayName || trainer?.email || "—"}</td>
                          <td><CreditBadge credits={tr.credits} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ══════════ MORE ══════════ */}
        {tab === "more" && (
          <>
            <div className="more-profile">
              <div className="more-avatar">
                {(currentUser?.email || "A")[0].toUpperCase()}
              </div>
              <div>
                <div className="more-name">{currentUser?.email}</div>
                <div className="more-email">{t("superAdmin")}</div>
                <div className="more-role"><span className="role-badge badge-superadmin">{t("superAdminRole")}</span></div>
              </div>
            </div>

            <div className="more-actions">
              <button className="more-action-btn danger" onClick={handleLogout}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                {t("signOut")}
              </button>
            </div>
          </>
        )}
      </main>

      <BottomNav tabs={TABS} activeTab={tab} onTabChange={setTab} />

      {/* ── Add Trainer Modal ─────────────────────────────────────── */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={t("addNewTrainer")}>
        <form onSubmit={handleAddTrainer} className="modal-form">
          {addError && <div className="alert-error">{addError}</div>}
          <div className="form-group">
            <label>{t("fullName")}</label>
            <input type="text" required placeholder="John Doe"
              value={addForm.displayName}
              onChange={(e) => setAddForm({ ...addForm, displayName: e.target.value })} />
          </div>
          <div className="form-group">
            <label>{t("email")}</label>
            <input type="email" required placeholder="trainer@gym.com"
              value={addForm.email}
              onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} />
          </div>
          <div className="form-group">
            <label>{t("password")}</label>
            <input type="password" required minLength={6} placeholder={t("minChars")}
              value={addForm.password}
              onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>{t("cancel")}</button>
            <button type="submit" className="btn-primary" disabled={addLoading}>
              {addLoading ? t("creating") : t("createTrainer")}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Trainer Confirm Modal ─────────────────────────── */}
      <Modal open={!!delTarget} onClose={() => setDelTarget(null)} title={t("deleteTrainer")}>
        <p className="confirm-text">
          {delTarget?.displayName || delTarget?.email}
          {" — "}
          <span className="text-muted">{t("permanentDeleteWarning")}</span>
        </p>

        {/* Orphan protection: warn about trainees */}
        {delTarget && traineeCountFor(delTarget.id) > 0 && (
          <div className="alert-warning" style={{ marginBottom: "0.75rem" }}>
            <p style={{ marginBottom: "0.5rem" }}>
              ⚠️ {t("deleteTrainerWarning").replace("{count}", traineeCountFor(delTarget.id))}
            </p>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.85rem" }}>
              <input
                type="checkbox"
                checked={delConfirmChecked}
                onChange={(e) => setDelConfirmChecked(e.target.checked)}
              />
              {t("deleteTrainerConfirmCheck")}
            </label>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={() => setDelTarget(null)}>{t("cancel")}</button>
          <button
            className="btn-danger"
            onClick={handleDelete}
            disabled={
              delLoading ||
              (delTarget && traineeCountFor(delTarget.id) > 0 && !delConfirmChecked)
            }
          >
            {delLoading ? t("deleting") : t("deleteTrainer")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
