import { useState, useEffect } from "react";
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import LineChart from "./LineChart";

const SUB_TABS = [
  { key: "weight",       label: "Weight"   },
  { key: "measurements", label: "Body"     },
  { key: "exercises",    label: "Exercise" },
  { key: "custom",       label: "Custom"   },
  { key: "notes",        label: "Notes"    },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * ProgressPanel
 * isTrainer:  true when viewed by the trainer (can add weight/measurements/custom, read notes)
 * sessions:   array of session objects (to derive exercise progression)
 * traineeId:  Firestore uid of the trainee
 * trainerId:  Firestore uid of the trainer (used when creating records)
 */
export default function ProgressPanel({ traineeId, trainerId, isTrainer = true, sessions = [] }) {
  const [subTab,      setSubTab]      = useState("weight");
  const [entries,     setEntries]     = useState([]);
  const [metrics,     setMetrics]     = useState([]);

  // Add-entry forms
  const [showAddW,    setShowAddW]    = useState(false);
  const [wForm,       setWForm]       = useState({ date: todayStr(), weight: "" });

  const [showAddM,    setShowAddM]    = useState(false);
  const [mForm,       setMForm]       = useState({ date: todayStr(), chest: "", waist: "", hip: "", arm: "", leg: "" });

  const [showAddN,    setShowAddN]    = useState(false);
  const [nForm,       setNForm]       = useState({ date: todayStr(), text: "", energy: "", sleep: "" });

  const [showAddMet,  setShowAddMet]  = useState(false);
  const [metForm,     setMetForm]     = useState({ name: "", unit: "" });
  const [showAddVal,  setShowAddVal]  = useState(null); // metricId
  const [valForm,     setValForm]     = useState({ date: todayStr(), value: "" });

  const [selExercise, setSelExercise] = useState("");

  // ── Listeners ────────────────────────────────────────────────────
  useEffect(() => {
    if (!traineeId) return;
    return onSnapshot(
      query(collection(db, "progressEntries"), where("traineeId", "==", traineeId)),
      (s) => setEntries(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, [traineeId]);

  useEffect(() => {
    if (!traineeId) return;
    return onSnapshot(
      query(collection(db, "progressMetrics"), where("traineeId", "==", traineeId)),
      (s) => setMetrics(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, [traineeId]);

  // ── Helpers ──────────────────────────────────────────────────────
  const weightEntries = entries.filter((e) => e.type === "weight")
    .sort((a, b) => b.date.localeCompare(a.date));
  const measEntries   = entries.filter((e) => e.type === "measurements")
    .sort((a, b) => b.date.localeCompare(a.date));
  const noteEntries   = entries.filter((e) => e.type === "personal_note")
    .sort((a, b) => b.date.localeCompare(a.date));

  // Exercise progression: extract exercise names from session exerciseBlocks
  const exerciseMap = {};
  sessions
    .filter((s) => s.exerciseBlocks?.length)
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((s) => {
      s.exerciseBlocks.forEach((b) => {
        if (!b.movement) return;
        if (!exerciseMap[b.movement]) exerciseMap[b.movement] = [];
        exerciseMap[b.movement].push({ date: s.date, sets: b.sets, reps: b.reps, weight: b.weight, duration: b.duration, durationUnit: b.durationUnit, useTime: b.useTime });
      });
    });
  const exerciseNames = Object.keys(exerciseMap).sort();

  // ── Write helpers ─────────────────────────────────────────────────
  async function addEntry(data) {
    await addDoc(collection(db, "progressEntries"), {
      traineeId,
      trainerId,
      createdAt: serverTimestamp(),
      ...data,
    });
  }

  async function delEntry(id) {
    await deleteDoc(doc(db, "progressEntries", id));
  }

  async function addMetric() {
    if (!metForm.name.trim()) return;
    await addDoc(collection(db, "progressMetrics"), {
      traineeId,
      trainerId,
      name:      metForm.name.trim(),
      unit:      metForm.unit.trim(),
      createdAt: serverTimestamp(),
    });
    setMetForm({ name: "", unit: "" });
    setShowAddMet(false);
  }

  async function addMetricValue(metricId) {
    if (!valForm.value) return;
    await addEntry({ type: "custom", metricId, date: valForm.date, value: parseFloat(valForm.value) });
    setValForm({ date: todayStr(), value: "" });
    setShowAddVal(null);
  }

  async function delMetric(id) {
    await deleteDoc(doc(db, "progressMetrics", id));
  }

  function fmtDate(d) {
    return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <div className="progress-panel">
      <div className="progress-sub-tabs">
        {SUB_TABS.map((t) => (
          <button
            key={t.key}
            className={`progress-sub-btn${subTab === t.key ? " active" : ""}`}
            onClick={() => setSubTab(t.key)}
          >{t.label}</button>
        ))}
      </div>

      {/* ── WEIGHT ── */}
      {subTab === "weight" && (
        <div className="progress-content">
          {weightEntries.length >= 2 && (
            <LineChart
              data={weightEntries.map((e) => ({ date: e.date, value: e.weight }))}
              unit=" kg"
            />
          )}
          {isTrainer && (
            <>
              {!showAddW ? (
                <button className="btn-primary" style={{ marginBottom: "0.75rem" }} onClick={() => setShowAddW(true)}>
                  + Log Weight
                </button>
              ) : (
                <div className="add-progress-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Date</label>
                      <input type="date" value={wForm.date} onChange={(e) => setWForm({ ...wForm, date: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Weight (kg)</label>
                      <input type="number" min="0" step="0.1" placeholder="75.0" value={wForm.weight}
                        onChange={(e) => setWForm({ ...wForm, weight: e.target.value })} />
                    </div>
                  </div>
                  <div className="modal-actions">
                    <button className="btn-secondary" onClick={() => setShowAddW(false)}>Cancel</button>
                    <button className="btn-primary" onClick={async () => {
                      if (!wForm.weight) return;
                      await addEntry({ type: "weight", date: wForm.date, weight: parseFloat(wForm.weight) });
                      setWForm({ date: todayStr(), weight: "" });
                      setShowAddW(false);
                    }}>Save</button>
                  </div>
                </div>
              )}
            </>
          )}
          {weightEntries.length === 0 ? (
            <div className="empty-state" style={{ padding: "1.5rem 0" }}>
              <span className="empty-icon">⚖️</span>
              <p>No weight entries yet.</p>
            </div>
          ) : (
            <div className="progress-entries-list">
              {weightEntries.map((e) => (
                <div key={e.id} className="progress-entry">
                  <div>
                    <div className="entry-date">{fmtDate(e.date)}</div>
                    <div className="entry-value">{e.weight} kg</div>
                  </div>
                  {isTrainer && (
                    <button className="sc-btn danger" onClick={() => delEntry(e.id)}>✕</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── BODY MEASUREMENTS ── */}
      {subTab === "measurements" && (
        <div className="progress-content">
          {isTrainer && (
            <>
              {!showAddM ? (
                <button className="btn-primary" style={{ marginBottom: "0.75rem" }} onClick={() => setShowAddM(true)}>
                  + Log Measurements
                </button>
              ) : (
                <div className="add-progress-form">
                  <div className="form-group">
                    <label>Date</label>
                    <input type="date" value={mForm.date} onChange={(e) => setMForm({ ...mForm, date: e.target.value })} />
                  </div>
                  {["chest", "waist", "hip", "arm", "leg"].map((field) => (
                    <div className="form-group" key={field}>
                      <label>{field.charAt(0).toUpperCase() + field.slice(1)} (cm) <span className="label-opt">opt.</span></label>
                      <input type="number" min="0" step="0.5" placeholder="—"
                        value={mForm[field]}
                        onChange={(e) => setMForm({ ...mForm, [field]: e.target.value })} />
                    </div>
                  ))}
                  <div className="modal-actions">
                    <button className="btn-secondary" onClick={() => setShowAddM(false)}>Cancel</button>
                    <button className="btn-primary" onClick={async () => {
                      const data = { type: "measurements", date: mForm.date };
                      ["chest", "waist", "hip", "arm", "leg"].forEach((f) => {
                        if (mForm[f]) data[f] = parseFloat(mForm[f]);
                      });
                      await addEntry(data);
                      setMForm({ date: todayStr(), chest: "", waist: "", hip: "", arm: "", leg: "" });
                      setShowAddM(false);
                    }}>Save</button>
                  </div>
                </div>
              )}
            </>
          )}
          {measEntries.length === 0 ? (
            <div className="empty-state" style={{ padding: "1.5rem 0" }}>
              <span className="empty-icon">📏</span>
              <p>No body measurements yet.</p>
            </div>
          ) : (
            <div className="progress-entries-list">
              {measEntries.map((e) => (
                <div key={e.id} className="progress-entry">
                  <div style={{ flex: 1 }}>
                    <div className="entry-date">{fmtDate(e.date)}</div>
                    <div className="meas-chips">
                      {["chest", "waist", "hip", "arm", "leg"].map((f) =>
                        e[f] ? <span key={f} className="ex-chip">{f}: {e[f]}cm</span> : null
                      )}
                    </div>
                  </div>
                  {isTrainer && (
                    <button className="sc-btn danger" onClick={() => delEntry(e.id)}>✕</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── EXERCISE PROGRESSION ── */}
      {subTab === "exercises" && (
        <div className="progress-content">
          {exerciseNames.length === 0 ? (
            <div className="empty-state" style={{ padding: "1.5rem 0" }}>
              <span className="empty-icon">🏋️</span>
              <p>No exercise data yet. Complete sessions with exercise blocks to see progression.</p>
            </div>
          ) : (
            <>
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label>Select Exercise</label>
                <select value={selExercise} onChange={(e) => setSelExercise(e.target.value)}>
                  <option value="">— Choose exercise —</option>
                  {exerciseNames.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              {selExercise && exerciseMap[selExercise] && (
                <>
                  {exerciseMap[selExercise].filter((e) => e.weight).length >= 2 && (
                    <LineChart
                      data={exerciseMap[selExercise]
                        .filter((e) => e.weight)
                        .map((e) => ({ date: e.date, value: parseFloat(e.weight) }))}
                      unit=" kg"
                      color="#4caf50"
                    />
                  )}
                  <div className="progress-entries-list">
                    {[...exerciseMap[selExercise]].reverse().map((e, i) => (
                      <div key={i} className="progress-entry">
                        <div>
                          <div className="entry-date">{fmtDate(e.date)}</div>
                          <div className="meas-chips">
                            {e.sets    && <span className="ex-chip">{e.sets} sets</span>}
                            {!e.useTime && e.reps && <span className="ex-chip">{e.reps} reps</span>}
                            {e.useTime && e.duration && <span className="ex-chip">{e.duration} {e.durationUnit}</span>}
                            {e.weight  && <span className="ex-chip">{e.weight} kg</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ── CUSTOM METRICS ── */}
      {subTab === "custom" && (
        <div className="progress-content">
          {isTrainer && (
            <>
              {!showAddMet ? (
                <button className="btn-primary" style={{ marginBottom: "0.75rem" }} onClick={() => setShowAddMet(true)}>
                  + Define Metric
                </button>
              ) : (
                <div className="add-progress-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Metric Name</label>
                      <input type="text" placeholder="e.g. VO2 Max" value={metForm.name}
                        onChange={(e) => setMetForm({ ...metForm, name: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Unit</label>
                      <input type="text" placeholder="e.g. bpm, kg, %" value={metForm.unit}
                        onChange={(e) => setMetForm({ ...metForm, unit: e.target.value })} />
                    </div>
                  </div>
                  <div className="modal-actions">
                    <button className="btn-secondary" onClick={() => setShowAddMet(false)}>Cancel</button>
                    <button className="btn-primary" onClick={addMetric}>Create</button>
                  </div>
                </div>
              )}
            </>
          )}

          {metrics.length === 0 ? (
            <div className="empty-state" style={{ padding: "1.5rem 0" }}>
              <span className="empty-icon">📊</span>
              <p>{isTrainer ? "Define a custom metric to start tracking." : "No custom metrics yet."}</p>
            </div>
          ) : (
            metrics.map((m) => {
              const vals = entries
                .filter((e) => e.type === "custom" && e.metricId === m.id)
                .sort((a, b) => b.date.localeCompare(a.date));
              return (
                <div key={m.id} className="metric-card">
                  <div className="metric-card-header">
                    <span className="metric-name">{m.name} <span className="metric-unit">({m.unit})</span></span>
                    {isTrainer && (
                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        <button className="sc-btn" onClick={() => { setShowAddVal(m.id); setValForm({ date: todayStr(), value: "" }); }}>
                          + Value
                        </button>
                        <button className="sc-btn danger" onClick={() => delMetric(m.id)}>✕</button>
                      </div>
                    )}
                  </div>
                  {showAddVal === m.id && (
                    <div className="add-progress-form">
                      <div className="form-row">
                        <div className="form-group">
                          <label>Date</label>
                          <input type="date" value={valForm.date}
                            onChange={(e) => setValForm({ ...valForm, date: e.target.value })} />
                        </div>
                        <div className="form-group">
                          <label>Value ({m.unit})</label>
                          <input type="number" step="any" value={valForm.value}
                            onChange={(e) => setValForm({ ...valForm, value: e.target.value })} />
                        </div>
                      </div>
                      <div className="modal-actions">
                        <button className="btn-secondary" onClick={() => setShowAddVal(null)}>Cancel</button>
                        <button className="btn-primary" onClick={() => addMetricValue(m.id)}>Save</button>
                      </div>
                    </div>
                  )}
                  {vals.length >= 2 && (
                    <LineChart
                      data={vals.map((e) => ({ date: e.date, value: e.value }))}
                      unit={m.unit ? ` ${m.unit}` : ""}
                      color="#888"
                    />
                  )}
                  <div className="progress-entries-list">
                    {vals.map((e) => (
                      <div key={e.id} className="progress-entry">
                        <div>
                          <div className="entry-date">{fmtDate(e.date)}</div>
                          <div className="entry-value">{e.value} {m.unit}</div>
                        </div>
                        {isTrainer && (
                          <button className="sc-btn danger" onClick={() => delEntry(e.id)}>✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── PERSONAL NOTES (trainee writes, trainer reads) ── */}
      {subTab === "notes" && (
        <div className="progress-content">
          {!isTrainer && (
            <>
              {!showAddN ? (
                <button className="btn-primary" style={{ marginBottom: "0.75rem" }} onClick={() => setShowAddN(true)}>
                  + Add Note
                </button>
              ) : (
                <div className="add-progress-form">
                  <div className="form-group">
                    <label>Date</label>
                    <input type="date" value={nForm.date} onChange={(e) => setNForm({ ...nForm, date: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>How did you feel? <span className="label-opt">opt.</span></label>
                    <textarea rows={3} placeholder="Energy, mood, motivation…" value={nForm.text}
                      onChange={(e) => setNForm({ ...nForm, text: e.target.value })} />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Energy Level <span className="label-opt">opt.</span></label>
                      <input type="text" placeholder="e.g. High, 7/10" value={nForm.energy}
                        onChange={(e) => setNForm({ ...nForm, energy: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Sleep <span className="label-opt">opt.</span></label>
                      <input type="text" placeholder="e.g. 8h, poor" value={nForm.sleep}
                        onChange={(e) => setNForm({ ...nForm, sleep: e.target.value })} />
                    </div>
                  </div>
                  <div className="modal-actions">
                    <button className="btn-secondary" onClick={() => setShowAddN(false)}>Cancel</button>
                    <button className="btn-primary" onClick={async () => {
                      await addEntry({ type: "personal_note", date: nForm.date, text: nForm.text, energy: nForm.energy, sleep: nForm.sleep });
                      setNForm({ date: todayStr(), text: "", energy: "", sleep: "" });
                      setShowAddN(false);
                    }}>Save Note</button>
                  </div>
                </div>
              )}
            </>
          )}
          {noteEntries.length === 0 ? (
            <div className="empty-state" style={{ padding: "1.5rem 0" }}>
              <span className="empty-icon">📝</span>
              <p>{isTrainer ? "Trainee hasn't added any personal notes yet." : "No personal notes yet. Add how you feel after sessions!"}</p>
            </div>
          ) : (
            <div className="progress-entries-list">
              {noteEntries.map((e) => (
                <div key={e.id} className="progress-entry note-entry">
                  <div style={{ flex: 1 }}>
                    <div className="entry-date">{fmtDate(e.date)}</div>
                    {e.text && <p className="note-text">{e.text}</p>}
                    <div className="meas-chips">
                      {e.energy && <span className="ex-chip">⚡ {e.energy}</span>}
                      {e.sleep  && <span className="ex-chip">💤 {e.sleep}</span>}
                    </div>
                  </div>
                  {!isTrainer && (
                    <button className="sc-btn danger" onClick={() => delEntry(e.id)}>✕</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
