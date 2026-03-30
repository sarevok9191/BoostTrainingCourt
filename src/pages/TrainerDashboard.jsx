import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection, query, where, onSnapshot,
  addDoc, deleteDoc, doc,
  serverTimestamp, runTransaction,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { createUserAccount, deleteUserAccount } from "../firebase/userManagement";
import { useAuth } from "../contexts/AuthContext";
import Modal from "../components/Modal";
import BottomNav from "../components/BottomNav";
import CalendarView from "../components/CalendarView";
import ExerciseBlockForm, { emptyBlock } from "../components/ExerciseBlockForm";
import TraineeDetailOverlay from "../components/TraineeDetailOverlay";

// ── Color constants ────────────────────────────────────────────────
const COLOR_OWN   = "#F5A623";  // amber  — logged-in trainer
const COLOR_OTHER = "#4FC3F7";  // blue   — any other trainer

// ── Utilities ──────────────────────────────────────────────────────
function toDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
function fmtDay(date) {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
function fmtTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function CreditBadge({ credits }) {
  const n   = credits ?? 0;
  const cls = n > 5 ? "green" : n > 0 ? "amber" : "red";
  return <span className={`credit-badge ${cls}`}>{n}</span>;
}

const TABS = [
  { key: "home",     label: "Home",     icon: "home"     },
  { key: "schedule", label: "Schedule", icon: "schedule" },
  { key: "trainees", label: "Trainees", icon: "trainees" },
  { key: "more",     label: "More",     icon: "more"     },
];

export default function TrainerDashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const [tab,           setTab]           = useState("home");
  const [trainees,      setTrainees]      = useState([]);
  const [allSessions,   setAllSessions]   = useState([]);   // ALL trainers' sessions
  const [allTrainers,   setAllTrainers]   = useState([]);   // other trainers

  // Schedule: selected day + filter chip
  const [selectedDay,    setSelectedDay]    = useState(toDateKey(new Date()));
  const [scheduleFilter, setScheduleFilter] = useState("all"); // "all" | uid

  // Trainee detail overlay
  const [detailTrainee, setDetailTrainee] = useState(null);

  // Add-trainee modal
  const [showAddTrainee,  setShowAddTrainee]  = useState(false);
  const [traineeForm,     setTraineeForm]     = useState({ displayName: "", email: "", password: "", credits: 10 });
  const [traineeErr,      setTraineeErr]      = useState("");
  const [traineeLoading,  setTraineeLoading]  = useState(false);

  // Add-session modal (structured notes)
  const [showAddSession,  setShowAddSession]  = useState(false);
  const [sessionForm,     setSessionForm]     = useState({ traineeId: "", date: toDateKey(new Date()), time: "09:00" });
  const [sessBlocks,      setSessBlocks]      = useState([]);
  const [sessNotes,       setSessNotes]       = useState("");
  const [sessionErr,      setSessionErr]      = useState("");
  const [sessionLoading,  setSessionLoading]  = useState(false);

  // Mark-complete modal
  const [completeTarget,  setCompleteTarget]  = useState(null);
  const [cmpBlocks,       setCmpBlocks]       = useState([]);
  const [cmpNotes,        setCmpNotes]        = useState("");
  const [completeLoading, setCompleteLoading] = useState(false);

  // Delete confirms
  const [delTrainee,  setDelTrainee]  = useState(null);
  const [delSession,  setDelSession]  = useState(null);
  const [delLoading,  setDelLoading]  = useState(false);

  // ── Firestore listeners ──────────────────────────────────────────
  // Own trainees
  useEffect(() => onSnapshot(
    query(collection(db, "users"), where("role","==","trainee"), where("trainerId","==",currentUser.uid)),
    (s) => setTrainees(s.docs.map((d) => ({ id: d.id, ...d.data() })))
  ), [currentUser.uid]);

  // ALL sessions from ALL trainers (trainers can read all per security rules)
  useEffect(() => onSnapshot(
    collection(db, "sessions"),
    (s) => setAllSessions(s.docs.map((d) => ({ id: d.id, ...d.data() })))
  ), []);

  // All other trainers (for chip row names)
  useEffect(() => onSnapshot(
    query(collection(db, "users"), where("role","==","trainer")),
    (s) => setAllTrainers(
      s.docs.map((d) => ({ id: d.id, ...d.data() }))
        .filter((t) => t.id !== currentUser.uid)
    )
  ), [currentUser.uid]);

  // ── Derived data ─────────────────────────────────────────────────
  // Own sessions (for home tab, stats, trainee detail)
  const sessions    = allSessions.filter((s) => s.trainerId === currentUser.uid);
  const otherSess   = allSessions.filter((s) => s.trainerId !== currentUser.uid);

  const todayKey    = toDateKey(new Date());
  const todaySess   = sessions.filter((s) => s.date === todayKey).sort((a, b) => a.time.localeCompare(b.time));

  // Schedule tab — filtered sessions for selected day
  const filteredDaySessions = allSessions
    .filter((s) => s.date === selectedDay)
    .filter((s) => scheduleFilter === "all" || s.trainerId === scheduleFilter)
    .sort((a, b) => a.time.localeCompare(b.time));

  // For mark-complete credit display
  const traineeForComplete = trainees.find((t) => t.id === completeTarget?.traineeId);
  const curCredits         = traineeForComplete?.credits ?? 0;
  const afterCredits       = Math.max(0, curCredits - 1);

  const displayName = currentUser?.displayName || currentUser?.email?.split("@")[0] || "Trainer";

  // ── Handlers ────────────────────────────────────────────────────
  async function handleAddTrainee(e) {
    e.preventDefault();
    setTraineeErr("");
    setTraineeLoading(true);
    try {
      await createUserAccount({
        email:       traineeForm.email,
        password:    traineeForm.password,
        displayName: traineeForm.displayName,
        role:        "trainee",
        trainerId:   currentUser.uid,
        credits:     Number(traineeForm.credits),
      });
      setShowAddTrainee(false);
      setTraineeForm({ displayName: "", email: "", password: "", credits: 10 });
    } catch (err) {
      setTraineeErr(err.message);
    } finally {
      setTraineeLoading(false);
    }
  }

  async function handleDeleteTrainee() {
    if (!delTrainee) return;
    setDelLoading(true);
    try {
      await deleteUserAccount(delTrainee.id);
      setDelTrainee(null);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setDelLoading(false);
    }
  }

  async function handleAddSession(e) {
    e.preventDefault();
    setSessionErr("");
    setSessionLoading(true);
    try {
      const trainee = trainees.find((t) => t.id === sessionForm.traineeId);
      await addDoc(collection(db, "sessions"), {
        trainerId:      currentUser.uid,
        trainerName:    currentUser.displayName || currentUser.email,
        traineeId:      sessionForm.traineeId,
        traineeName:    trainee?.displayName || trainee?.email || "",
        date:           sessionForm.date,
        time:           sessionForm.time,
        exerciseBlocks: sessBlocks,
        notes:          sessNotes,
        status:         "scheduled",
        createdAt:      serverTimestamp(),
      });
      setShowAddSession(false);
      setSessionForm({ traineeId: "", date: selectedDay, time: "09:00" });
      setSessBlocks([]);
      setSessNotes("");
    } catch (err) {
      setSessionErr(err.message);
    } finally {
      setSessionLoading(false);
    }
  }

  async function handleDeleteSession() {
    if (!delSession) return;
    setDelLoading(true);
    try {
      await deleteDoc(doc(db, "sessions", delSession.id));
      setDelSession(null);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setDelLoading(false);
    }
  }

  async function handleMarkComplete() {
    if (!completeTarget) return;
    setCompleteLoading(true);
    try {
      const sessionRef = doc(db, "sessions", completeTarget.id);
      const traineeRef = doc(db, "users",    completeTarget.traineeId);
      await runTransaction(db, async (tx) => {
        const snap    = await tx.get(traineeRef);
        const credits = snap.data()?.credits ?? 0;
        tx.update(sessionRef, {
          status:         "completed",
          completedAt:    serverTimestamp(),
          exerciseBlocks: cmpBlocks.length > 0 ? cmpBlocks : (completeTarget.exerciseBlocks || []),
          notes:          cmpNotes || completeTarget.notes || "",
        });
        tx.update(traineeRef, { credits: Math.max(0, credits - 1) });
      });
      setCompleteTarget(null);
      setCmpBlocks([]);
      setCmpNotes("");
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setCompleteLoading(false);
    }
  }

  async function handleLogout() { await logout(); navigate("/login", { replace: true }); }

  // ── Trainee detail overlay ────────────────────────────────────────
  if (detailTrainee) {
    const liveTrainee     = trainees.find((t) => t.id === detailTrainee.id) || detailTrainee;
    const traineeSessions = allSessions.filter((s) => s.traineeId === detailTrainee.id);
    return (
      <div className="app-shell">
        <main className="dash-main">
          <TraineeDetailOverlay
            trainee={liveTrainee}
            sessions={traineeSessions}
            trainerId={currentUser.uid}
            onBack={() => setDetailTrainee(null)}
          />
        </main>
        <BottomNav tabs={TABS} activeTab="trainees"
          onTabChange={(t) => { setDetailTrainee(null); setTab(t); }} />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="app-shell">
      <main className="dash-main">

        {/* ══════════ HOME ══════════ */}
        {tab === "home" && (
          <>
            <div className="home-greeting">
              <div className="greeting-hello">{getGreeting()},</div>
              <div className="greeting-name">{displayName}</div>
            </div>
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-icon">👤</span>
                <span className="stat-value">{trainees.length}</span>
                <span className="stat-label">My Trainees</span>
              </div>
              <div className="stat-card">
                <span className="stat-icon">📅</span>
                <span className="stat-value">{sessions.length}</span>
                <span className="stat-label">My Sessions</span>
              </div>
              <div className="stat-card">
                <span className="stat-icon">✅</span>
                <span className="stat-value">{sessions.filter((s) => s.status === "completed").length}</span>
                <span className="stat-label">Completed</span>
              </div>
              <div className="stat-card">
                <span className="stat-icon">⚡</span>
                <span className="stat-value">{todaySess.length}</span>
                <span className="stat-label">Today</span>
              </div>
            </div>
            <section className="section-card">
              <div className="section-header">
                <h2>Today&apos;s Sessions</h2>
                <span className="role-badge badge-trainer">Trainer</span>
              </div>
              {todaySess.length === 0 ? (
                <div className="empty-state" style={{ padding: "1.25rem 0" }}>
                  <span className="empty-icon">📋</span>
                  <p>No sessions scheduled for today.</p>
                </div>
              ) : (
                todaySess.map((s) => (
                  <OwnSessionCard
                    key={s.id}
                    session={s}
                    onComplete={() => { setCompleteTarget(s); setCmpBlocks(s.exerciseBlocks?.map(b => ({ ...b, id: b.id || emptyBlock().id })) || []); setCmpNotes(s.notes || ""); }}
                    onDelete={() => setDelSession(s)}
                  />
                ))
              )}
            </section>
          </>
        )}

        {/* ══════════ SCHEDULE (shared — feature: two-color) ══════════ */}
        {tab === "schedule" && (
          <>
            {/* ── Trainer filter chip row ── */}
            <div className="chip-row">
              {/* All */}
              <button
                className={`trainer-chip chip-all${scheduleFilter === "all" ? " active" : ""}`}
                onClick={() => setScheduleFilter("all")}
              >All</button>

              {/* Me (own) — yellow */}
              <button
                className={`trainer-chip chip-mine${scheduleFilter === currentUser.uid ? " active" : ""}`}
                onClick={() => setScheduleFilter(currentUser.uid)}
              >Me</button>

              {/* Other trainers — blue */}
              {allTrainers.map((t) => (
                <button
                  key={t.id}
                  className={`trainer-chip chip-other${scheduleFilter === t.id ? " active" : ""}`}
                  onClick={() => setScheduleFilter(t.id)}
                >
                  {t.displayName || t.email.split("@")[0]}
                </button>
              ))}
            </div>

            {/* ── Month calendar with two-color dots ── */}
            <CalendarView
              ownSessions={sessions}
              otherSessions={otherSess}
              onDayClick={(day) => setSelectedDay(toDateKey(day))}
              selectedDay={selectedDay}
            />

            {/* ── Day session list ── */}
            <section className="section-card">
              <div className="section-header" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
                <h2>
                  {selectedDay === todayKey
                    ? "Today"
                    : fmtDay(new Date(selectedDay + "T00:00:00"))}
                </h2>
                <button className="btn-primary"
                  onClick={() => {
                    setSessionErr("");
                    setSessionForm((f) => ({ ...f, date: selectedDay }));
                    setSessBlocks([]);
                    setSessNotes("");
                    setShowAddSession(true);
                  }}>
                  + Add Session
                </button>
              </div>

              {filteredDaySessions.length === 0 ? (
                <div className="empty-state" style={{ padding: "1.25rem 0" }}>
                  <span className="empty-icon">📅</span>
                  <p>No sessions on this day.</p>
                </div>
              ) : (
                filteredDaySessions.map((s) => {
                  const isOwn = s.trainerId === currentUser.uid;
                  return isOwn ? (
                    <OwnSessionCard
                      key={s.id}
                      session={s}
                      onComplete={() => { setCompleteTarget(s); setCmpBlocks(s.exerciseBlocks?.map(b => ({ ...b, id: b.id || emptyBlock().id })) || []); setCmpNotes(s.notes || ""); }}
                      onDelete={() => setDelSession(s)}
                    />
                  ) : (
                    <OtherSessionCard key={s.id} session={s} />
                  );
                })
              )}
            </section>
          </>
        )}

        {/* ══════════ TRAINEES ══════════ */}
        {tab === "trainees" && (
          <section className="section-card">
            <div className="section-header">
              <h2>My Trainees</h2>
              <button className="btn-primary" onClick={() => { setTraineeErr(""); setShowAddTrainee(true); }}>
                + Add Trainee
              </button>
            </div>
            {trainees.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">👤</span>
                <p>No trainees yet.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr><th>Name</th><th>Credits</th><th>Sessions</th><th></th></tr>
                  </thead>
                  <tbody>
                    {trainees.map((t) => (
                      <tr key={t.id} style={{ cursor: "pointer" }} onClick={() => setDetailTrainee(t)}>
                        <td>
                          <div className="cell-name">
                            <span className="avatar">{(t.displayName || t.email)[0].toUpperCase()}</span>
                            <div>
                              <div>{t.displayName || "—"}</div>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{t.email}</div>
                            </div>
                          </div>
                        </td>
                        <td><CreditBadge credits={t.credits} /></td>
                        <td className="cell-muted">{sessions.filter((s) => s.traineeId === t.id).length}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <button className="btn-danger-sm" onClick={() => setDelTrainee(t)}>Remove</button>
                        </td>
                      </tr>
                    ))}
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
                {(currentUser?.displayName || currentUser?.email || "T")[0].toUpperCase()}
              </div>
              <div>
                <div className="more-name">{currentUser?.displayName || currentUser?.email}</div>
                <div className="more-email">{currentUser?.email}</div>
                <div className="more-role"><span className="role-badge badge-trainer">Trainer</span></div>
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

      {/* ── Add Trainee ───────────────────────────────────────── */}
      <Modal open={showAddTrainee} onClose={() => setShowAddTrainee(false)} title="Add New Trainee">
        <form onSubmit={handleAddTrainee} className="modal-form">
          {traineeErr && <div className="alert-error">{traineeErr}</div>}
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" required placeholder="Jane Doe"
              value={traineeForm.displayName}
              onChange={(e) => setTraineeForm({ ...traineeForm, displayName: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" required placeholder="jane@example.com"
              value={traineeForm.email}
              onChange={(e) => setTraineeForm({ ...traineeForm, email: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" required minLength={6} placeholder="Min. 6 characters"
              value={traineeForm.password}
              onChange={(e) => setTraineeForm({ ...traineeForm, password: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Starting Credits</label>
            <input type="number" min={0}
              value={traineeForm.credits}
              onChange={(e) => setTraineeForm({ ...traineeForm, credits: e.target.value })} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setShowAddTrainee(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={traineeLoading}>
              {traineeLoading ? "Creating…" : "Create Trainee"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Add Session (exercise block form) ─────────────────── */}
      <Modal open={showAddSession} onClose={() => setShowAddSession(false)} title="Add Session">
        <form onSubmit={handleAddSession} className="modal-form">
          {sessionErr && <div className="alert-error">{sessionErr}</div>}
          <div className="form-group">
            <label>Trainee</label>
            <select required value={sessionForm.traineeId}
              onChange={(e) => setSessionForm({ ...sessionForm, traineeId: e.target.value })}>
              <option value="">— Select trainee —</option>
              {trainees.map((t) => <option key={t.id} value={t.id}>{t.displayName || t.email}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Date</label>
              <input type="date" required value={sessionForm.date}
                onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Time</label>
              <input type="time" required value={sessionForm.time}
                onChange={(e) => setSessionForm({ ...sessionForm, time: e.target.value })} />
            </div>
          </div>
          <ExerciseBlockForm
            blocks={sessBlocks} onChange={setSessBlocks}
            notes={sessNotes}   onNotesChange={setSessNotes}
          />
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setShowAddSession(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={sessionLoading}>
              {sessionLoading ? "Saving…" : "Add Session"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Mark Complete (credit preview + notes) ─────────────── */}
      <Modal
        open={!!completeTarget}
        onClose={() => { setCompleteTarget(null); setCmpBlocks([]); setCmpNotes(""); }}
        title="Mark Session Complete"
      >
        <div className="modal-form">
          <div className="complete-credit-preview">
            <span>Credits: <strong>{curCredits}</strong></span>
            <span className="arrow-right">→</span>
            <strong style={{ color: afterCredits <= 2 ? "#e57373" : "#4caf50" }}>{afterCredits}</strong>
            {afterCredits <= 2 && <span className="low-credit-warn">⚠ Low</span>}
          </div>
          <p className="confirm-text" style={{ marginBottom: "0.75rem" }}>
            Confirm session with <strong>{completeTarget?.traineeName}</strong> on {completeTarget?.date} is done?
          </p>
          <ExerciseBlockForm
            blocks={cmpBlocks} onChange={setCmpBlocks}
            notes={cmpNotes}   onNotesChange={setCmpNotes}
          />
          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => { setCompleteTarget(null); setCmpBlocks([]); setCmpNotes(""); }}>Cancel</button>
            <button className="btn-complete" onClick={handleMarkComplete} disabled={completeLoading}>
              {completeLoading ? "Saving…" : "✓ Mark Complete"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Delete Trainee ────────────────────────────────────── */}
      <Modal open={!!delTrainee} onClose={() => setDelTrainee(null)} title="Remove Trainee">
        <p className="confirm-text">
          Remove <strong>{delTrainee?.displayName || delTrainee?.email}</strong>?<br />
          <span className="text-muted">Their profile, sessions and progress data will be deleted.</span>
        </p>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={() => setDelTrainee(null)}>Cancel</button>
          <button className="btn-danger" onClick={handleDeleteTrainee} disabled={delLoading}>
            {delLoading ? "Removing…" : "Remove Trainee"}
          </button>
        </div>
      </Modal>

      {/* ── Delete Session ────────────────────────────────────── */}
      <Modal open={!!delSession} onClose={() => setDelSession(null)} title="Delete Session">
        <p className="confirm-text">
          Delete session with <strong>{delSession?.traineeName}</strong>{" "}
          on {delSession?.date} at {fmtTime(delSession?.time)}?
        </p>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={() => setDelSession(null)}>Cancel</button>
          <button className="btn-danger" onClick={handleDeleteSession} disabled={delLoading}>
            {delLoading ? "Deleting…" : "Delete Session"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ── Own session card (yellow, full actions) ───────────────────────
function OwnSessionCard({ session: s, onComplete, onDelete }) {
  const done = s.status === "completed";
  return (
    <div
      className={`session-card${done ? " completed" : ""}`}
      style={{ borderLeftColor: done ? "var(--text-hint)" : COLOR_OWN }}
    >
      <div className="sc-time" style={{ color: COLOR_OWN }}>{fmtTime(s.time)}</div>
      <div className="sc-name">{s.traineeName}</div>
      {done && <div className="sc-done-badge">✓ Done</div>}
      {s.exerciseBlocks?.length > 0 && (
        <div className="meas-chips" style={{ marginTop: "0.35rem" }}>
          {s.exerciseBlocks.slice(0, 3).map((b, i) =>
            b.movement ? <span key={i} className="ex-chip">{b.movement}</span> : null
          )}
          {s.exerciseBlocks.length > 3 && <span className="ex-chip">+{s.exerciseBlocks.length - 3}</span>}
        </div>
      )}
      {!s.exerciseBlocks?.length && s.notes && <div className="sc-notes">{s.notes}</div>}
      {!done && (
        <div className="sc-actions">
          <button className="sc-btn complete" onClick={onComplete}>✓ Complete</button>
          <button className="sc-btn danger"   onClick={onDelete}>✕</button>
        </div>
      )}
    </div>
  );
}

// ── Other trainer's session card (blue, read-only) ────────────────
function OtherSessionCard({ session: s }) {
  return (
    <div
      className={`session-card readonly other-trainer${s.status === "completed" ? " completed" : ""}`}
      style={{ borderLeftColor: COLOR_OTHER }}
    >
      <div className="sc-trainer-tag" style={{ color: COLOR_OTHER }}>
        {s.trainerName || "Other Trainer"}
      </div>
      <div className="sc-time" style={{ color: COLOR_OTHER }}>{fmtTime(s.time)}</div>
      <div className="sc-name">{s.traineeName}</div>
      {s.status === "completed" && <div className="sc-done-badge">✓ Done</div>}
      {s.exerciseBlocks?.length > 0 && (
        <div className="meas-chips" style={{ marginTop: "0.35rem" }}>
          {s.exerciseBlocks.slice(0, 3).map((b, i) =>
            b.movement ? <span key={i} className="ex-chip">{b.movement}</span> : null
          )}
        </div>
      )}
      {!s.exerciseBlocks?.length && s.notes && <div className="sc-notes">{s.notes}</div>}
    </div>
  );
}
