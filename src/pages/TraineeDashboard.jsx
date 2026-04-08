import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage, LangToggle } from "../contexts/LanguageContext";
import BottomNav from "../components/BottomNav";
import CalendarView from "../components/CalendarView";
import SessionDetailModal from "../components/SessionDetailModal";
import ProgressPanel from "../components/ProgressPanel";

// Tab label keys (translated by BottomNav via useLanguage)
const TABS = [
  { key: "home",     label: "home",     icon: "home"     },
  { key: "schedule", label: "schedule", icon: "schedule" },
  { key: "history",  label: "history",  icon: "history"  },
  { key: "more",     label: "more",     icon: "more"     },
];

// ── Utilities ─────────────────────────────────────────────────────
function toDateKey(date) {
  return [date.getFullYear(), String(date.getMonth()+1).padStart(2,"0"), String(date.getDate()).padStart(2,"0")].join("-");
}
function fmtTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function CreditBadge({ credits }) {
  const n   = credits ?? 0;
  const cls = n > 5 ? "green" : n > 0 ? "amber" : "red";
  return <span className={`credit-badge ${cls}`}>{n}</span>;
}

function SessionTypeBadge({ type }) {
  const { t } = useLanguage();
  if (!type || type === "gym") return <span className="session-type-badge gym">{t("gymBadge")}</span>;
  return <span className="session-type-badge home">{t("homeBadge")}</span>;
}

export default function TraineeDashboard() {
  // NEW: Destructure requestNotificationPermission from useAuth
  const { currentUser, logout, requestNotificationPermission } = useAuth();
  const { t, lang }             = useLanguage();
  const navigate                = useNavigate();
  const locale                  = lang === "tr" ? "tr-TR" : "en-US";

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

  // Load trainer name for onboarding empty state
  useEffect(() => {
    if (!userDoc?.trainerId) return;
    getDoc(doc(db, "users", userDoc.trainerId)).then((snap) => {
      if (snap.exists()) setTrainerName(snap.data().displayName || snap.data().email || "");
    });
  }, [userDoc?.trainerId]);

  function fmtDay(date) {
    return date.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" });
  }
  function fmtFullDate(dateStr) {
    if (!dateStr) return "";
    return new Date(dateStr + "T00:00:00").toLocaleDateString(locale, {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
  }

  async function handleLogout() { await logout(); navigate("/login", { replace: true }); }

  // NEW: Handler for enabling notifications
  async function handleEnableNotifications() {
    const success = await requestNotificationPermission();
    if (success) {
      alert(t("notificationsEnabled") || "Push notifications enabled successfully!");
    } else {
      alert(t("notificationsDenied") || "Notification permission denied or unavailable.");
    }
  }

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
      <LangToggle />
      <main className="dash-main">

        {/* ══════════ HOME ══════════ */}
        {tab === "home" && (
          <>
            <div className="home-greeting">
              <div className="greeting-hello">{t("welcomeBack")}</div>
              <div className="greeting-name">{displayName}</div>
            </div>

            {sessions.length === 0 ? (
              <div className="onboarding-card">
                <div className="onboarding-icon">🏋️</div>
                <h2 className="onboarding-title">{t("allSet")}</h2>
                <p className="onboarding-text">
                  {trainerName
                    ? <>{t("trainerWillSchedule").replace("{name}", "").trim()
                        .split(t("trainerWillSchedule").trim())[0]}
                        <strong>{trainerName}</strong>
                        {" "}
                        {t("trainerWillSchedule").includes("{name}")
                          ? t("trainerWillSchedule").split("{name}")[1]
                          : ""}
                      </>
                    : t("trainerWillSchedule")}
                </p>
                <div className="onboarding-credits">
                  <span className="onboarding-credits-label">{t("startingCreditsLabel")}</span>
                  <CreditBadge credits={credits} />
                </div>
                <p className="onboarding-hint">{t("comeBackHint")}</p>
              </div>
            ) : (
              <>
                <div className="credit-card">
                  <span className="credit-card-icon">💳</span>
                  <div className="credit-card-info">
                    <div className="credit-card-value">{credits}</div>
                    <div className="credit-card-label">{t("creditBalance")}</div>
                  </div>
                  <CreditBadge credits={credits} />
                </div>

                <div className="stats-grid">
                  <div className="stat-card">
                    <span className="stat-icon">📅</span>
                    <span className="stat-value">{upcoming.length}</span>
                    <span className="stat-label">{t("upcomingLabel")}</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-icon">✅</span>
                    <span className="stat-value">{completed.length}</span>
                    <span className="stat-label">{t("completedLabel")}</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-icon">🏋️</span>
                    <span className="stat-value">{sessions.length}</span>
                    <span className="stat-label">{t("totalLabel")}</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-icon">⚡</span>
                    <span className="stat-value">
                      {sessions.filter((s) => s.date === todayKey).length}
                    </span>
                    <span className="stat-label">{t("todayLabel")}</span>
                  </div>
                </div>

                {upcoming.length > 0 && (
                  <section className="section-card">
                    <div className="section-header"><h2>{t("upcomingSessions")}</h2></div>
                    <div className="history-list">
                      {upcoming.slice(0, 3).map((s) => (
                        <SessionListItem
                          key={s.id}
                          session={s}
                          variant="upcoming"
                          onClick={() => setSelectedSession(s)}
                          fmtFullDate={fmtFullDate}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </>
        )}

        {/* ══════════ SCHEDULE ══════════ */}
        {tab === "schedule" && (
          <>
            <CalendarView
              sessions={sessions}
              onDayClick={(day) => setSelectedDay(toDateKey(day))}
              selectedDay={selectedDay}
            />
            <section className="section-card">
              <div className="section-header">
                <h2>{selectedDay === todayKey ? t("today") : fmtDay(new Date(selectedDay + "T00:00:00"))}</h2>
              </div>
              {daySession.length === 0 ? (
                <div className="empty-state" style={{ padding: "1.25rem 0" }}>
                  <span className="empty-icon">📅</span>
                  <p>{t("noSessionsOnThisDay")}</p>
                </div>
              ) : (
                daySession.map((s) => (
                  <div
                    key={s.id}
                    className={`session-card readonly${s.status === "completed" ? " completed" : ""}`}
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedSession(s)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <div className="sc-time">{fmtTime(s.time)}</div>
                      <SessionTypeBadge type={s.sessionType} />
                    </div>
                    <div className="sc-name">
                      {s.trainerName ? `${t("withTrainer")} ${s.trainerName}` : t("training")}
                    </div>
                    {s.status === "completed" && <div className="sc-done-badge">{t("sessionCompleted")}</div>}
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
                <div className="section-header"><h2>{t("completedSessions")}</h2></div>
                <div className="history-list">
                  {completed.map((s) => (
                    <SessionListItem key={s.id} session={s} variant="completed"
                      onClick={() => setSelectedSession(s)} fmtFullDate={fmtFullDate} />
                  ))}
                </div>
              </section>
            )}
            {past.length > 0 && (
              <section className="section-card">
                <div className="section-header"><h2>{t("pastSessions")}</h2></div>
                <div className="history-list">
                  {past.map((s) => (
                    <SessionListItem key={s.id} session={s}
                      onClick={() => setSelectedSession(s)} fmtFullDate={fmtFullDate} />
                  ))}
                </div>
              </section>
            )}
            {completed.length === 0 && past.length === 0 && (
              <section className="section-card">
                <div className="empty-state">
                  <span className="empty-icon">📋</span>
                  <p>{t("noSessionHistoryYet")}</p>
                </div>
              </section>
            )}
          </>
        )}

        {/* ══════════ MORE ══════════ */}
        {tab === "more" && (
          <>
            <div className="more-profile">
              <div className="more-avatar">
                {(userDoc?.displayName || currentUser?.email || "T")[0].toUpperCase()}
              </div>
              <div>
                <div className="more-name">{userDoc?.displayName || currentUser?.email}</div>
                <div className="more-email">{currentUser?.email}</div>
                <div className="more-role"><span className="role-badge badge-trainee">{t("traineeRole")}</span></div>
              </div>
            </div>

            <section className="section-card" style={{ marginBottom: "0.75rem" }}>
              <div className="section-header"><h2>{t("myProgress")}</h2></div>
              <ProgressPanel
                traineeId={currentUser.uid}
                trainerId={userDoc?.trainerId || ""}
                isTrainer={false}
                sessions={sessions}
              />
            </section>

            <div className="more-actions">
              {/* NEW: Enable Notifications Button */}
              {(!('Notification' in window) || Notification.permission !== 'granted') && (
                <button className="more-action-btn" onClick={handleEnableNotifications} style={{ marginBottom: '1rem', color: '#10b981' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                  {t("enableNotifications") || "Enable Push Notifications"}
                </button>
              )}

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

function SessionListItem({ session: s, variant, onClick, fmtFullDate }) {
  const { t } = useLanguage();
  return (
    <div
      className={`history-item${variant === "upcoming" ? " upcoming" : ""}${variant === "completed" ? " done" : ""}`}
      style={{ cursor: "pointer" }}
      onClick={onClick}
    >
      <div className="history-left">
        <div className="history-date">{fmtFullDate(s.date)}</div>
        <div className="history-time">{fmtTime(s.time)}</div>
        <SessionTypeBadge type={s.sessionType} />
        {s.trainerName && (
          <div className="history-trainer">{t("trainer")}: {s.trainerName}</div>
        )}
        {variant === "completed" && <span className="history-done-badge">{t("done")}</span>}
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
          <p className="history-notes empty">{t("tapToView")}</p>
        )}
      </div>
    </div>
  );
}