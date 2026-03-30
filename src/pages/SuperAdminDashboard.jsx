import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import { createUserAccount, deleteUserAccount } from "../firebase/userManagement";
import { useAuth } from "../contexts/AuthContext";
import Modal from "../components/Modal";
import BottomNav from "../components/BottomNav";

const TABS = [
  { key: "home",     label: "Home",     icon: "home"     },
  { key: "trainers", label: "Trainers", icon: "trainers" },
  { key: "trainees", label: "Trainees", icon: "trainees" },
  { key: "more",     label: "More",     icon: "more"     },
];

function CreditBadge({ credits }) {
  const n   = credits ?? 0;
  const cls = n > 5 ? "green" : n > 0 ? "amber" : "red";
  return <span className={`credit-badge ${cls}`}>{n}</span>;
}

export default function SuperAdminDashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

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
  const [delTarget,  setDelTarget]  = useState(null);
  const [delLoading, setDelLoading] = useState(false);

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
      await deleteUserAccount(delTarget.id);
      setDelTarget(null);
    } catch (err) {
      alert("Delete failed: " + err.message);
    } finally {
      setDelLoading(false);
    }
  }

  async function handleLogout() { await logout(); navigate("/login", { replace: true }); }

  const traineeCountFor = (tid) => trainees.filter((t) => t.trainerId === tid).length;

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="app-shell">
      <main className="dash-main">

        {/* ══════════ HOME ══════════ */}
        {tab === "home" && (
          <>
            <div className="home-greeting">
              <div className="greeting-hello">Dashboard</div>
              <div className="greeting-name">Boost Training Court</div>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-icon">🏋️</span>
                <span className="stat-value">{trainers.length}</span>
                <span className="stat-label">Total Trainers</span>
              </div>
              <div className="stat-card">
                <span className="stat-icon">👤</span>
                <span className="stat-value">{trainees.length}</span>
                <span className="stat-label">Total Trainees</span>
              </div>
              <div className="stat-card accent">
                <span className="stat-icon">✅</span>
                <span className="stat-value">{trainers.length + trainees.length + 1}</span>
                <span className="stat-label">Active Accounts</span>
              </div>
              <div className="stat-card">
                <span className="stat-icon">📊</span>
                <span className="stat-value">
                  {trainers.length > 0 ? (trainees.length / trainers.length).toFixed(1) : "—"}
                </span>
                <span className="stat-label">Trainees / Trainer</span>
              </div>
            </div>

            {trainers.length > 0 && (
              <section className="section-card">
                <div className="section-header">
                  <h2>Trainer Overview</h2>
                  <span className="role-badge badge-superadmin">Super Admin</span>
                </div>
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead><tr><th>Trainer</th><th>Trainees</th></tr></thead>
                    <tbody>
                      {trainers.map((t) => (
                        <tr key={t.id}>
                          <td>
                            <div className="cell-name">
                              <span className="avatar">{(t.displayName || t.email)[0].toUpperCase()}</span>
                              {t.displayName || t.email}
                            </div>
                          </td>
                          <td><span className="count-badge">{traineeCountFor(t.id)}</span></td>
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
              <h2>Trainers</h2>
              <button className="btn-primary" onClick={() => { setAddError(""); setShowAdd(true); }}>
                + Add Trainer
              </button>
            </div>

            {loading ? (
              <p className="placeholder-text">Loading…</p>
            ) : trainers.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">🏋️</span>
                <p>No trainers yet. Add your first trainer.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr><th>Name</th><th>Email</th><th>Trainees</th><th>Created</th><th></th></tr>
                  </thead>
                  <tbody>
                    {trainers.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <div className="cell-name">
                            <span className="avatar">{(t.displayName || t.email)[0].toUpperCase()}</span>
                            {t.displayName || "—"}
                          </div>
                        </td>
                        <td className="cell-muted">{t.email}</td>
                        <td><span className="count-badge">{traineeCountFor(t.id)}</span></td>
                        <td className="cell-muted">
                          {t.createdAt?.toDate
                            ? t.createdAt.toDate().toLocaleDateString()
                            : t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "—"}
                        </td>
                        <td>
                          <button className="btn-danger-sm" onClick={() => setDelTarget(t)}>Delete</button>
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
            <div className="section-header"><h2>All Trainees</h2></div>
            {trainees.length === 0 ? (
              <p className="placeholder-text">No trainees yet.</p>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr><th>Name</th><th>Email</th><th>Trainer</th><th>Credits</th></tr>
                  </thead>
                  <tbody>
                    {trainees.map((t) => {
                      const trainer = trainers.find((r) => r.id === t.trainerId);
                      return (
                        <tr key={t.id}>
                          <td>
                            <div className="cell-name">
                              <span className="avatar avatar-sm">
                                {(t.displayName || t.email)[0].toUpperCase()}
                              </span>
                              {t.displayName || "—"}
                            </div>
                          </td>
                          <td className="cell-muted">{t.email}</td>
                          <td className="cell-muted">{trainer?.displayName || trainer?.email || "—"}</td>
                          <td><CreditBadge credits={t.credits} /></td>
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
                <div className="more-email">Super Administrator</div>
                <div className="more-role"><span className="role-badge badge-superadmin">Super Admin</span></div>
              </div>
            </div>

            <div className="more-actions">
              <button className="more-action-btn danger" onClick={handleLogout}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Sign Out
              </button>
            </div>
          </>
        )}
      </main>

      <BottomNav tabs={TABS} activeTab={tab} onTabChange={setTab} />

      {/* Add Trainer Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Trainer">
        <form onSubmit={handleAddTrainer} className="modal-form">
          {addError && <div className="alert-error">{addError}</div>}
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" required placeholder="John Doe"
              value={addForm.displayName}
              onChange={(e) => setAddForm({ ...addForm, displayName: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" required placeholder="trainer@gym.com"
              value={addForm.email}
              onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" required minLength={6} placeholder="Min. 6 characters"
              value={addForm.password}
              onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={addLoading}>
              {addLoading ? "Creating…" : "Create Trainer"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal open={!!delTarget} onClose={() => setDelTarget(null)} title="Delete Trainer">
        <p className="confirm-text">
          Permanently delete trainer{" "}
          <strong>{delTarget?.displayName || delTarget?.email}</strong>?<br />
          <span className="text-muted">Their Firestore profile and all data will be removed.</span>
        </p>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={() => setDelTarget(null)}>Cancel</button>
          <button className="btn-danger" onClick={handleDelete} disabled={delLoading}>
            {delLoading ? "Deleting…" : "Delete Trainer"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
