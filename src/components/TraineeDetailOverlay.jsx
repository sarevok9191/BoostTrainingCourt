import { useState } from "react";
import {
  doc, addDoc, collection,
  runTransaction, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useLanguage } from "../contexts/LanguageContext";
import ProgressPanel from "./ProgressPanel";
import SessionDetailModal from "./SessionDetailModal";

function fmtTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
function fmtFullDate(dateStr, locale) {
  if (!dateStr) return "";
  return new Date(dateStr + "T00:00:00").toLocaleDateString(locale, {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
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

/**
 * TraineeDetailOverlay
 * Shows trainee profile, sessions, and progress inside the trainer dashboard.
 */
export default function TraineeDetailOverlay({ trainee, sessions = [], trainerId, onBack }) {
  const { t, lang }        = useLanguage();
  const locale             = lang === "tr" ? "tr-TR" : "en-US";

  const [subTab,           setSubTab]           = useState("sessions");
  const [selectedSession,  setSelectedSession]  = useState(null);
  const [showTopUp,        setShowTopUp]        = useState(false);
  const [topUpAmount,      setTopUpAmount]      = useState("10");
  const [topUpLoading,     setTopUpLoading]     = useState(false);
  const [showPassword,     setShowPassword]     = useState(false);

  const sortedSessions = [...sessions].sort((a, b) =>
    b.date.localeCompare(a.date) || b.time.localeCompare(a.time)
  );

  async function handleTopUp() {
    const amount = parseInt(topUpAmount, 10);
    if (isNaN(amount) || amount <= 0) return;
    setTopUpLoading(true);
    try {
      const traineeRef = doc(db, "users", trainee.id);
      await runTransaction(db, async (tx) => {
        const snap    = await tx.get(traineeRef);
        const current = snap.data()?.credits ?? 0;
        tx.update(traineeRef, { credits: current + amount });
      });
      await addDoc(collection(db, "creditLogs"), {
        traineeId:   trainee.id,
        traineeName: trainee.displayName || trainee.email,
        trainerId,
        amount,
        note:        "manual top-up",
        createdAt:   serverTimestamp(),
      });
      setShowTopUp(false);
      setTopUpAmount("10");
    } catch (err) {
      alert(t("error") + ": " + err.message);
    } finally {
      setTopUpLoading(false);
    }
  }

  const initials = (trainee.displayName || trainee.email || "?")[0].toUpperCase();
  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <div className="trainee-detail-overlay">
      {/* ── Back button ── */}
      <button className="detail-back-btn" onClick={onBack}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        {t("backToTrainees")}
      </button>

      {/* ── Profile header ── */}
      <div className="detail-profile-header">
        <div className="more-avatar" style={{ width: 52, height: 52, fontSize: "1.25rem" }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="more-name">{trainee.displayName || "—"}</div>
          <div className="more-email">{trainee.email}</div>
          {trainee.declaredPassword && (
            <div className="declared-pw">
              <span>{t("declaredPassword")}: </span>
              {showPassword
                ? <span style={{ color: "var(--text)" }}>{trainee.declaredPassword}</span>
                : <span style={{ color: "var(--text-hint)", letterSpacing: "0.1em" }}>••••••••</span>}
              <button
                className="sc-btn"
                style={{ padding: "2px 7px", marginLeft: "0.4rem" }}
                onClick={() => setShowPassword((p) => !p)}
              >{showPassword ? t("hidePassword") : t("showPassword")}</button>
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.4rem" }}>
          <CreditBadge credits={trainee.credits} />
          <button className="btn-primary" style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem" }}
            onClick={() => setShowTopUp(true)}>
            {t("topUp")}
          </button>
        </div>
      </div>

      {/* ── Top-up inline form ── */}
      {showTopUp && (
        <div className="add-progress-form" style={{ marginBottom: "0.75rem" }}>
          <div className="form-row">
            <div className="form-group">
              <label>{t("creditsToAdd")}</label>
              <input type="number" min="1" value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)} />
            </div>
            <div className="form-group" style={{ justifyContent: "flex-end", marginTop: "auto" }}>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowTopUp(false)}>{t("cancel")}</button>
                <button className="btn-primary" onClick={handleTopUp} disabled={topUpLoading}>
                  {topUpLoading ? "…" : t("confirmTopUp")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Sub-tabs ── */}
      <div className="detail-sub-tabs">
        <button
          className={`detail-sub-btn${subTab === "sessions" ? " active" : ""}`}
          onClick={() => setSubTab("sessions")}
        >{t("sessionsTab")}</button>
        <button
          className={`detail-sub-btn${subTab === "progress" ? " active" : ""}`}
          onClick={() => setSubTab("progress")}
        >{t("progressTab")}</button>
      </div>

      {/* ── SESSIONS tab ── */}
      {subTab === "sessions" && (
        <div>
          {sortedSessions.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📋</span>
              <p>{t("noSessionsYet")}</p>
            </div>
          ) : (
            <div className="history-list">
              {sortedSessions.map((s) => (
                <div
                  key={s.id}
                  className={`history-item${s.date >= todayISO ? " upcoming" : ""}${s.status === "completed" ? " done" : ""}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedSession(s)}
                >
                  <div className="history-left">
                    <div className="history-date">{fmtFullDate(s.date, locale)}</div>
                    <div className="history-time">{fmtTime(s.time)}</div>
                    <SessionTypeBadge type={s.sessionType} />
                    {s.status === "completed" && <span className="history-done-badge">{t("done")}</span>}
                  </div>
                  <div className="history-right">
                    {s.exerciseBlocks?.length > 0 ? (
                      <div className="meas-chips">
                        {s.exerciseBlocks.slice(0, 3).map((b, i) => (
                          b.movement ? <span key={i} className="ex-chip">{b.movement}</span> : null
                        ))}
                        {s.exerciseBlocks.length > 3 && (
                          <span className="ex-chip">+{s.exerciseBlocks.length - 3} more</span>
                        )}
                      </div>
                    ) : s.notes ? (
                      <p className="history-notes">{s.notes.slice(0, 80)}{s.notes.length > 80 ? "…" : ""}</p>
                    ) : (
                      <p className="history-notes empty">{t("tapToViewEdit")}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PROGRESS tab ── */}
      {subTab === "progress" && (
        <ProgressPanel
          traineeId={trainee.id}
          trainerId={trainerId}
          isTrainer={true}
          sessions={sessions}
        />
      )}

      {/* ── Session detail modal ── */}
      {selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
          readonly={false}
        />
      )}
    </div>
  );
}
