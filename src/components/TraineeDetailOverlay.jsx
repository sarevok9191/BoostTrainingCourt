import { useState } from "react";
import {
  doc, updateDoc, addDoc, collection,
  runTransaction, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import ProgressPanel from "./ProgressPanel";
import SessionDetailModal from "./SessionDetailModal";

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

/**
 * TraineeDetailOverlay
 * Shows trainee profile, sessions, and progress inside the trainer dashboard.
 */
export default function TraineeDetailOverlay({ trainee, sessions = [], trainerId, onBack }) {
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
      alert("Top-up failed: " + err.message);
    } finally {
      setTopUpLoading(false);
    }
  }

  const initials = (trainee.displayName || trainee.email || "?")[0].toUpperCase();

  return (
    <div className="trainee-detail-overlay">
      {/* ── Back button ── */}
      <button className="detail-back-btn" onClick={onBack}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Trainees
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
              <span>Password: </span>
              {showPassword
                ? <span style={{ color: "var(--text)" }}>{trainee.declaredPassword}</span>
                : <span style={{ color: "var(--text-hint)", letterSpacing: "0.1em" }}>••••••••</span>}
              <button
                className="sc-btn"
                style={{ padding: "2px 7px", marginLeft: "0.4rem" }}
                onClick={() => setShowPassword((p) => !p)}
              >{showPassword ? "Hide" : "Show"}</button>
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.4rem" }}>
          <CreditBadge credits={trainee.credits} />
          <button className="btn-primary" style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem" }}
            onClick={() => setShowTopUp(true)}>
            + Top Up
          </button>
        </div>
      </div>

      {/* ── Top-up inline form ── */}
      {showTopUp && (
        <div className="add-progress-form" style={{ marginBottom: "0.75rem" }}>
          <div className="form-row">
            <div className="form-group">
              <label>Credits to Add</label>
              <input type="number" min="1" value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)} />
            </div>
            <div className="form-group" style={{ justifyContent: "flex-end", marginTop: "auto" }}>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowTopUp(false)}>Cancel</button>
                <button className="btn-primary" onClick={handleTopUp} disabled={topUpLoading}>
                  {topUpLoading ? "…" : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Sub-tabs ── */}
      <div className="detail-sub-tabs">
        {["sessions", "progress"].map((t) => (
          <button
            key={t}
            className={`detail-sub-btn${subTab === t ? " active" : ""}`}
            onClick={() => setSubTab(t)}
          >{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {/* ── SESSIONS tab ── */}
      {subTab === "sessions" && (
        <div>
          {sortedSessions.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📋</span>
              <p>No sessions yet for this trainee.</p>
            </div>
          ) : (
            <div className="history-list">
              {sortedSessions.map((s) => (
                <div
                  key={s.id}
                  className={`history-item${s.date >= new Date().toISOString().slice(0,10) ? " upcoming" : ""}${s.status === "completed" ? " done" : ""}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedSession(s)}
                >
                  <div className="history-left">
                    <div className="history-date">{fmtFullDate(s.date)}</div>
                    <div className="history-time">{fmtTime(s.time)}</div>
                    {s.status === "completed" && <span className="history-done-badge">✓ Done</span>}
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
                      <p className="history-notes empty">Tap to view / edit notes</p>
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
