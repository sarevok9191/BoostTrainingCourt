import { useState, useEffect } from "react";
import {
  collection, query, where, onSnapshot,
  addDoc, deleteDoc, doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useLanguage } from "../contexts/LanguageContext";
import LineChart from "./LineChart";

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
  const { t, lang } = useLanguage();
  const locale      = lang === "tr" ? "tr-TR" : "en-US";

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

  const SUB_TABS = [
    { key: "weight",       labelKey: "weight"           },
    { key: "measurements", labelKey: "bodyMeasurements" },
    { key: "exercises",    labelKey: "exercise"         },
    { key: "custom",       labelKey: "custom"           },
    { key: "notes",        labelKey: "notes"            },
  ];

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
    return new Date(d + "T00:00:00").toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
  }

  const measFields = ["chest", "waist", "hip", "arm", "leg"];

  return (
    <div className="progress-panel">
      <div className="progress-sub-tabs">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.key}
            className={`progress-sub-btn${subTab === tab.key ? " active" : ""}`}
            onClick={() => setSubTab(tab.key)}
          >{t(tab.labelKey)}</button>
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
                  {t("logWeight")}
                </button>
              ) : (
                <div className="add-progress-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>{t("date")}</label>
                      <input type="date" value={wForm.date} onChange={(e) => setWForm({ ...wForm, date: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>{t("weight")} (kg)</label>
                      <input type="number" min="0" step="0.1" placeholder="75.0" value={wForm.weight}
                        onChange={(e) => setWForm({ ...wForm, weight: e.target.value })} />
                    </div>
                  </div>
                  <div className="modal-actions">
                    <button className="btn-secondary" onClick={() => setShowAddW(false)}>{t("cancel")}</button>
                    <button className="btn-primary" onClick={async () => {
                      if (!wForm.weight) return;
                      await addEntry({ type: "weight", date: wForm.date, weight: parseFloat(wForm.weight) });
                      setWForm({ date: todayStr(), weight: "" });
                      setShowAddW(false);
                    }}>{t("save")}</button>
                  </div>
                </div>
              )}
            </>
          )}
          {weightEntries.length === 0 ? (
            <div className="empty-state" style={{ padding: "1.5rem 0" }}>
              <span className="empty-icon">⚖️</span>
              <p>{t("noWeightEntries")}</p>
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
                  {t("logMeasurements")}
                </button>
              ) : (
                <div className="add-progress-form">
                  <div className="form-group">
                    <label>{t("date")}</label>
                    <input type="date" value={mForm.date} onChange={(e) => setMForm({ ...mForm, date: e.target.value })} />
                  </div>
                  {measFields.map((field) => (
                    <div className="form-group" key={field}>
                      <label>{t(field)} (cm) <span className="label-opt">{t("optional")}</span></label>
                      <input type="number" min="0" step="0.5" placeholder="—"
                        value={mForm[field]}
                        onChange={(e) => setMForm({ ...mForm, [field]: e.target.value })} />
                    </div>
                  ))}
                  <div className="modal-actions">
                    <button className="btn-secondary" onClick={() => setShowAddM(false)}>{t("cancel")}</button>
                    <button className="btn-primary" onClick={async () => {
                      const data = { type: "measurements", date: mForm.date };
                      measFields.forEach((f) => { if (mForm[f]) data[f] = parseFloat(mForm[f]); });
                      await addEntry(data);
                      setMForm({ date: todayStr(), chest: "", waist: "", hip: "", arm: "", leg: "" });
                      setShowAddM(false);
                    }}>{t("save")}</button>
                  </div>
                </div>
              )}
            </>
          )}
          {measEntries.length === 0 ? (
            <div className="empty-state" style={{ padding: "1.5rem 0" }}>
              <span className="empty-icon">📏</span>
              <p>{t("noMeasurements")}</p>
            </div>
          ) : (
            <div className="progress-entries-list">
              {measEntries.map((e) => (
                <div key={e.id} className="progress-entry">
                  <div style={{ flex: 1 }}>
                    <div className="entry-date">{fmtDate(e.date)}</div>
                    <div className="meas-chips">
                      {measFields.map((f) =>
                        e[f] ? <span key={f} className="ex-chip">{t(f)}: {e[f]}cm</span> : null
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
              <p>{t("noExerciseDataComplete")}</p>
            </div>
          ) : (
            <>
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label>{t("exercise")}</label>
                <select value={selExercise} onChange={(e) => setSelExercise(e.target.value)}>
                  <option value="">{t("selectExercise")}</option>
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
                  {t("defineMetric")}
                </button>
              ) : (
                <div className="add-progress-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>{t("metricName")}</label>
                      <input type="text" placeholder="e.g. VO2 Max" value={metForm.name}
                        onChange={(e) => setMetForm({ ...metForm, name: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>{t("unit")}</label>
                      <input type="text" placeholder="e.g. bpm, kg, %" value={metForm.unit}
                        onChange={(e) => setMetForm({ ...metForm, unit: e.target.value })} />
                    </div>
                  </div>
                  <div className="modal-actions">
                    <button className="btn-secondary" onClick={() => setShowAddMet(false)}>{t("cancel")}</button>
                    <button className="btn-primary" onClick={addMetric}>{t("confirm")}</button>
                  </div>
                </div>
              )}
            </>
          )}

          {metrics.length === 0 ? (
            <div className="empty-state" style={{ padding: "1.5rem 0" }}>
              <span className="empty-icon">📊</span>
              <p>{isTrainer ? t("noCustomMetrics") : t("noCustomMetricsTrainee")}</p>
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
                          {t("addValue")}
                        </button>
                        <button className="sc-btn danger" onClick={() => delMetric(m.id)}>✕</button>
                      </div>
                    )}
                  </div>
                  {showAddVal === m.id && (
                    <div className="add-progress-form">
                      <div className="form-row">
                        <div className="form-group">
                          <label>{t("date")}</label>
                          <input type="date" value={valForm.date}
                            onChange={(e) => setValForm({ ...valForm, date: e.target.value })} />
                        </div>
                        <div className="form-group">
                          <label>{t("unit")} ({m.unit})</label>
                          <input type="number" step="any" value={valForm.value}
                            onChange={(e) => setValForm({ ...valForm, value: e.target.value })} />
                        </div>
                      </div>
                      <div className="modal-actions">
                        <button className="btn-secondary" onClick={() => setShowAddVal(null)}>{t("cancel")}</button>
                        <button className="btn-primary" onClick={() => addMetricValue(m.id)}>{t("save")}</button>
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
                  {t("addNote")}
                </button>
              ) : (
                <div className="add-progress-form">
                  <div className="form-group">
                    <label>{t("date")}</label>
                    <input type="date" value={nForm.date} onChange={(e) => setNForm({ ...nForm, date: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>{t("howDidYouFeel")} <span className="label-opt">{t("optional")}</span></label>
                    <textarea rows={3} placeholder={t("feelingPlaceholder")} value={nForm.text}
                      onChange={(e) => setNForm({ ...nForm, text: e.target.value })} />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>{t("energyLevel")} <span className="label-opt">{t("optional")}</span></label>
                      <input type="text" placeholder={t("energyPlaceholder")} value={nForm.energy}
                        onChange={(e) => setNForm({ ...nForm, energy: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>{t("sleep")} <span className="label-opt">{t("optional")}</span></label>
                      <input type="text" placeholder={t("sleepPlaceholder")} value={nForm.sleep}
                        onChange={(e) => setNForm({ ...nForm, sleep: e.target.value })} />
                    </div>
                  </div>
                  <div className="modal-actions">
                    <button className="btn-secondary" onClick={() => setShowAddN(false)}>{t("cancel")}</button>
                    <button className="btn-primary" onClick={async () => {
                      await addEntry({ type: "personal_note", date: nForm.date, text: nForm.text, energy: nForm.energy, sleep: nForm.sleep });
                      setNForm({ date: todayStr(), text: "", energy: "", sleep: "" });
                      setShowAddN(false);
                    }}>{t("saveNote")}</button>
                  </div>
                </div>
              )}
            </>
          )}
          {noteEntries.length === 0 ? (
            <div className="empty-state" style={{ padding: "1.5rem 0" }}>
              <span className="empty-icon">📝</span>
              <p>{isTrainer ? t("noPersonalNotesTrainer") : t("noPersonalNotes")}</p>
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
