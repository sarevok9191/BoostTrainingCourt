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
            <span className="exercise-num">Exercise {i + 1}</span>
            <button type="button" className="sc-btn danger" onClick={() => remove(b.id)}>✕</button>
          </div>

          <div className="form-group">
            <label>Movement</label>
            <input
              type="text"
              placeholder="e.g. Bench Press, Squat, Pull-up…"
              value={b.movement}
              onChange={(e) => update(b.id, "movement", e.target.value)}
            />
          </div>

          <div className="exercise-row">
            <div className="form-group">
              <label>Sets</label>
              <input
                type="number" min="0" placeholder="3"
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
                >Reps</button>
                <button
                  type="button"
                  className={`toggle-btn${b.useTime ? " active" : ""}`}
                  onClick={() => update(b.id, "useTime", true)}
                >Time</button>
              </div>
              {!b.useTime ? (
                <input
                  type="number" min="0" placeholder="10"
                  value={b.reps}
                  onChange={(e) => update(b.id, "reps", e.target.value)}
                />
              ) : (
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <input
                    type="number" min="0" placeholder="30"
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
              <label>Weight (kg) <span className="label-opt">opt.</span></label>
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
        + Add Exercise
      </button>

      <div className="form-group" style={{ marginTop: "1rem" }}>
        <label>Session Notes <span className="label-opt">(optional)</span></label>
        <textarea
          rows={3}
          placeholder="General notes about this session…"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
        />
      </div>
    </div>
  );
}

/** Read-only display of exercise blocks */
export function ExerciseBlockDisplay({ blocks = [], notes }) {
  if (!blocks || blocks.length === 0) {
    return notes
      ? <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.6 }}>{notes}</p>
      : <p style={{ fontSize: "0.85rem", color: "var(--text-hint)", fontStyle: "italic" }}>No exercise notes recorded.</p>;
  }
  return (
    <div className="exercise-display">
      {blocks.map((b, i) => (
        <div key={b.id || i} className="exercise-display-block">
          <div className="ex-display-name">{b.movement || `Exercise ${i + 1}`}</div>
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
          <div style={{ fontSize: "0.72rem", color: "var(--text-hint)", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Notes</div>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.5 }}>{notes}</p>
        </div>
      )}
    </div>
  );
}
