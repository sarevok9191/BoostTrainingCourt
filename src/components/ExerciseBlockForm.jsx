import { useLanguage } from "../contexts/LanguageContext";

/** Creates a stable unique key without depending on crypto */
export function emptyBlock() {
  return {
    id:           Math.random().toString(36).slice(2) + Date.now().toString(36),
    movement:     "",
    sets:         "",
    reps:         "",
    duration:     "",
    durationUnit: "sec",
    weight:       "",
    useTime:      false,
  };
}

/**
 * ExerciseBlockForm
 *
 * Props:
 *  blocks        — array of exercise block objects
 *  onChange      — (newBlocks) => void
 *  notes         — free-text session notes string
 *  onNotesChange — (string) => void
 */
export default function ExerciseBlockForm({ blocks = [], onChange, notes = "", onNotesChange }) {
  const { t } = useLanguage();

  function update(id, field, value) {
    onChange(blocks.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
  }
  function remove(id) { onChange(blocks.filter((b) => b.id !== id)); }
  function add()      { onChange([...blocks, emptyBlock()]); }

  return (
    <div className="exercise-form">
      {blocks.map((b, i) => (
        <div key={b.id} className="exercise-block">
          <div className="exercise-block-header">
            <span className="exercise-num">{t("exerciseNum")} {i + 1}</span>
            <button type="button" className="sc-btn danger" onClick={() => remove(b.id)}>✕</button>
          </div>

          <div className="form-group">
            <label>{t("movement")}</label>
            <input
              type="text"
              placeholder={t("movementPlaceholder")}
              value={b.movement}
              onChange={(e) => update(b.id, "movement", e.target.value)}
            />
          </div>

          <div className="exercise-row">
            <div className="form-group">
              <label>{t("sets")}</label>
              <input
                type="number" min="0" placeholder={t("setsPlaceholder")}
                value={b.sets}
                onChange={(e) => update(b.id, "sets", e.target.value)}
              />
            </div>

            <div className="form-group">
              <div className="rep-time-toggle">
                <button
                  type="button"
                  className={`toggle-btn${!b.useTime ? " active" : ""}`}
                  onClick={() => update(b.id, "useTime", false)}
                >{t("repsLabel")}</button>
                <button
                  type="button"
                  className={`toggle-btn${b.useTime ? " active" : ""}`}
                  onClick={() => update(b.id, "useTime", true)}
                >{t("timeLabel")}</button>
              </div>
              {!b.useTime ? (
                <input
                  type="number" min="0" placeholder={t("repsPlaceholder")}
                  value={b.reps}
                  onChange={(e) => update(b.id, "reps", e.target.value)}
                />
              ) : (
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <input
                    type="number" min="0" placeholder={t("durationPlaceholder")}
                    value={b.duration}
                    onChange={(e) => update(b.id, "duration", e.target.value)}
                    style={{ flex: 1, minWidth: 0 }}
                  />
                  <select
                    value={b.durationUnit}
                    onChange={(e) => update(b.id, "durationUnit", e.target.value)}
                    style={{ width: "62px", flexShrink: 0 }}
                  >
                    <option value="sec">sec</option>
                    <option value="min">min</option>
                  </select>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>{t("weightOptional")} <span className="label-opt">{t("optional")}</span></label>
              <input
                type="number" min="0" step="0.5" placeholder="60"
                value={b.weight}
                onChange={(e) => update(b.id, "weight", e.target.value)}
              />
            </div>
          </div>
        </div>
      ))}

      <button type="button" className="btn-add-exercise" onClick={add}>
        {t("addExercise")}
      </button>

      <div className="form-group" style={{ marginTop: "1rem" }}>
        <label>{t("sessionNotesLabel")} <span className="label-opt">({t("optional")})</span></label>
        <textarea
          rows={3}
          placeholder={t("sessionNotesPlaceholder")}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
        />
      </div>
    </div>
  );
}

/** Read-only display of exercise blocks */
export function ExerciseBlockDisplay({ blocks = [], notes }) {
  const { t } = useLanguage();

  if (!blocks || blocks.length === 0) {
    return notes
      ? <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.6 }}>{notes}</p>
      : <p style={{ fontSize: "0.85rem", color: "var(--text-hint)", fontStyle: "italic" }}>{t("noExerciseNotes")}</p>;
  }
  return (
    <div className="exercise-display">
      {blocks.map((b, i) => (
        <div key={b.id || i} className="exercise-display-block">
          <div className="ex-display-name">{b.movement || `${t("exerciseNum")} ${i + 1}`}</div>
          <div className="ex-display-row">
            {b.sets   && <span className="ex-chip">{b.sets} sets</span>}
            {!b.useTime && b.reps && <span className="ex-chip">{b.reps} reps</span>}
            {b.useTime && b.duration && <span className="ex-chip">{b.duration} {b.durationUnit}</span>}
            {b.weight && <span className="ex-chip">{b.weight} kg</span>}
          </div>
        </div>
      ))}
      {notes && (
        <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "0.5px solid var(--border)" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-hint)", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("notes")}</div>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.5 }}>{notes}</p>
        </div>
      )}
    </div>
  );
}
