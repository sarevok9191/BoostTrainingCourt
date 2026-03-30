import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import BottomNav from "../components/BottomNav";
import CalendarView from "../components/CalendarView";
import SessionDetailModal from "../components/SessionDetailModal";
import ProgressPanel from "../components/ProgressPanel";

// ── Utilities ─────────────────────────────────────────────────────
function toDateKey(date) {
  return [date.getFullYear(), String(date.getMonth()+1).padStart(2,"0"), String(date.getDate()).padStart(2,"0")].join("-");
}
function fmtDay(date) {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
function fmtTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
function fmtFullDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function CreditBadge({ credits }) {
  const n   = credits ?? 0;
  const cls = n > 5 ? "green" : n > 0 ? "amber" : "red";
  return <span className={`credit-badge ${cls}`}>{n}</span>;
}

const TABS = [
  { key: "home",     label: "Home",     icon: "home"     },
  { key: "schedule", label: "Schedule", icon: "schedule" },
  { key: "history",  label: "History",  icon: "history"  },
  { key: "more",     label: "More",     icon: "more"     },
];

export default function TraineeDashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const [tab,             setTab]             = useState("home");
  const [userDoc,         setUserDoc]         = useState(null);
  const [sessions,        setSessions]        = useState([]);
  const [trainerName,     setTrainerName]     = useState("");
  const [selectedDay,     setSelectedDay]     = useState(toDateKey(new Date()));
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    return onSnapshot(doc(db, "users", currentUser.uid), (snap) => {
      if (snap.exists()) setUserDoc(snap.data());
    });
  }, [currentUser.uid]);

  useEffect(() => {
    return onSnapshot(
      query(collection(db, "sessions"), where("traineeId", "==", currentUser.uid)),
      (s) => setSessions(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, [currentUser.uid]);

  // Load trainer name for onboarding empty state (feature 8)
  useEffect(() => {
    if (!userDoc?.trainerId) return;
    getDoc(doc(db, "users", userDoc.trainerId)).then((snap) => {
      if (snap.exists()) setTrainerName(snap.data().displayName || snap.data().email || "");
    });
  }, [userDoc?.trainerId]);

  async function handleLogout() { await logout(); navigate("/login", { replace: true }); }

  const todayKey   = toDateKey(new Date());
  const daySession = sessions.filter((s) => s.date === selectedDay).sort((a, b) => a.time.localeCompare(b.time));
  const upcoming   = sessions.filter((s) => s.date >= todayKey && s.status !== "completed")
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const completed  = sessions.filter((s) => s.status === "completed")
    .sort((a, b) => b.date.localeCompare(a.date));
  const past       = sessions.filter((s) => s.date < todayKey && s.status !== "completed")
    .sort((a, b) => b.date.localeCompare(a.date));

  const credits     = userDoc?.credits ?? 0;
  const displayName = userDoc?.displayName || currentUser?.email?.split("@")[0] || "Trainee";

  return (
    <div className="app-shell">
      <main className="dash-main">

        {/* ══════════ HOME ══════════ */}
        {tab === "home" && (
          <>
            <div className="home-greeting">
              <div className="greeting-hello">Welcome back,</div>
              <div className="greeting-name">{displayName}</div>
            </div>

            {/* Feature 8 — onboarding empty state when no sessions */}
            {sessions.length === 0 ? (
              <div className="onboarding-card">
                <div className="onboarding-icon">🏋️</div>
                <h2 className="onboarding-title">You&apos;re all set!</h2>
                <p className="onboarding-text">
                  {trainerName
                    ? <>Your trainer <strong>{trainerName}</strong> will schedule your first session soon.</>
                    : "Your trainer will schedule your first session soon."}
                </p>
                <div className="onboarding-credits">
                  <span className="onboarding-credits-label">Starting Credits</span>
                  <CreditBadge credits={credits} />
                </div>
                <p className="onboarding-hint">Come back here to see your schedule, session history and progress.</p>
              </div>
            ) : (
              <>
                <div className="credit-card">
                  <span className="credit-card-icon">💳</span>
                  <div className="credit-card-info">
                    <div className="credit-card-value">{credits}</div>
                    <div className="credit-card-label">Credit Balance</div>
                  </div>
                  <CreditBadge credits={credits} />
                </div>

                <div className="stats-grid">
                  <div className="stat-card">
                    <span className="stat-icon">📅</span>
                    <span className="stat-value">{upcoming.length}</span>
                    <span className="stat-label">Upcoming</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-icon">✅</span>
                    <span className="stat-value">{completed.length}</span>
                    <span className="stat-label">Completed</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-icon">🏋️</span>
                    <span className="stat-value">{sessions.length}</span>
                    <span className="stat-label">Total</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-icon">⚡</span>
                    <span className="stat-value">
                      {sessions.filter((s) => s.date === todayKey).length}
                    </span>
                    <span className="stat-label">Today</span>
                  </div>
                </div>

                {upcoming.length > 0 && (
                  <section className="section-card">
                    <div className="section-header"><h2>Upcoming Sessions</h2></div>
                    <div className="history-list">
                      {upcoming.slice(0, 3).map((s) => (
                        <SessionListItem
                          key={s.id}
                          session={s}
                          variant="upcoming"
                          onClick={() => setSelectedSession(s)}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </>
        )}

        {/* ══════════ SCHEDULE (simplified — feature 9) ══════════ */}
        {tab === "schedule" && (
          <>
            <CalendarView
              sessions={sessions}
              onDayClick={(day) => setSelectedDay(toDateKey(day))}
              selectedDay={selectedDay}
            />
            <section className="section-card">
              <div className="section-header">
                <h2>{selectedDay === todayKey ? "Today" : fmtDay(new Date(selectedDay + "T00:00:00"))}</h2>
              </div>
              {daySession.length === 0 ? (
                <div className="empty-state" style={{ padding: "1.25rem 0" }}>
                  <span className="empty-icon">📅</span>
                  <p>No sessions on this day.</p>
                </div>
              ) : (
                daySession.map((s) => (
                  <div
                    key={s.id}
                    className={`session-card readonly${s.status === "completed" ? " completed" : ""}`}
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedSession(s)}
                  >
                    <div className="sc-time">{fmtTime(s.time)}</div>
                    <div className="sc-name">{s.trainerName ? `with ${s.trainerName}` : "Training"}</div>
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
                ))
              )}
            </section>
          </>
        )}

        {/* ══════════ HISTORY ══════════ */}
        {tab === "history" && (
          <>
            {completed.length > 0 && (
              <section className="section-card">
                <div className="section-header"><h2>Completed Sessions</h2></div>
                <div className="history-list">
                  {completed.map((s) => (
                    <SessionListItem key={s.id} session={s} variant="completed" onClick={() => setSelectedSession(s)} />
                  ))}
                </div>
              </section>
            )}
            {past.length > 0 && (
              <section className="section-card">
                <div className="section-header"><h2>Past Sessions</h2></div>
                <div className="history-list">
                  {past.map((s) => (
                    <SessionListItem key={s.id} session={s} onClick={() => setSelectedSession(s)} />
                  ))}
                </div>
              </section>
            )}
            {completed.length === 0 && past.length === 0 && (
              <section className="section-card">
                <div className="empty-state">
                  <span className="empty-icon">📋</span>
                  <p>No session history yet.</p>
                </div>
              </section>
            )}
          </>
        )}

        {/* ══════════ PROGRESS ══════════ */}
        {tab === "more" && (
          <>
            <div className="more-profile">
              <div className="more-avatar">
                {(userDoc?.displayName || currentUser?.email || "T")[0].toUpperCase()}
              </div>
              <div>
                <div className="more-name">{userDoc?.displayName || currentUser?.email}</div>
                <div className="more-email">{currentUser?.email}</div>
                <div className="more-role"><span className="role-badge badge-trainee">Trainee</span></div>
              </div>
            </div>

            {/* Progress section for trainee */}
            <section className="section-card" style={{ marginBottom: "0.75rem" }}>
              <div className="section-header"><h2>My Progress</h2></div>
              <ProgressPanel
                traineeId={currentUser.uid}
                trainerId={userDoc?.trainerId || ""}
                isTrainer={false}
                sessions={sessions}
              />
            </section>

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

      {/* Session detail modal — read-only for trainee (feature 6) */}
      {selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
          readonly={true}
        />
      )}
    </div>
  );
}

function SessionListItem({ session: s, variant, onClick }) {
  return (
    <div
      className={`history-item${variant === "upcoming" ? " upcoming" : ""}${variant === "completed" ? " done" : ""}`}
      style={{ cursor: "pointer" }}
      onClick={onClick}
    >
      <div className="history-left">
        <div className="history-date">{fmtFullDate(s.date)}</div>
        <div className="history-time">{fmtTime(s.time)}</div>
        {s.trainerName && <div className="history-trainer">Trainer: {s.trainerName}</div>}
        {variant === "completed" && <span className="history-done-badge">✓ Done</span>}
      </div>
      <div className="history-right">
        {s.exerciseBlocks?.length > 0 ? (
          <div className="meas-chips">
            {s.exerciseBlocks.slice(0, 2).map((b, i) =>
              b.movement ? <span key={i} className="ex-chip">{b.movement}</span> : null
            )}
            {s.exerciseBlocks.length > 2 && <span className="ex-chip">+{s.exerciseBlocks.length - 2}</span>}
          </div>
        ) : s.notes ? (
          <p className="history-notes">{s.notes.slice(0, 60)}{s.notes.length > 60 ? "…" : ""}</p>
        ) : (
          <p className="history-notes empty">Tap to view session</p>
        )}
      </div>
    </div>
  );
}
