import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import Modal from "./Modal";
import ExerciseBlockForm, { ExerciseBlockDisplay, emptyBlock } from "./ExerciseBlockForm";

function fmtTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

/**
 * SessionDetailModal
 *
 * readonly:  true → trainee view (read-only)
 *            false → trainer view (editable)
 */
export default function SessionDetailModal({ session, onClose, readonly = true }) {
  const [editing,    setEditing]    = useState(false);
  const [blocks,     setBlocks]     = useState(() =>
    session?.exerciseBlocks?.length
      ? session.exerciseBlocks.map((b) => ({ ...b, id: b.id || emptyBlock().id }))
      : []
  );
  const [notes,      setNotes]      = useState(session?.notes || "");
  const [saving,     setSaving]     = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateDoc(doc(db, "sessions", session.id), {
        exerciseBlocks: blocks,
        notes,
      });
      setEditing(false);
    } catch (err) {
      alert("Error saving: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!session) return null;

  const title = `${session.traineeName || session.trainerName || "Session"} — ${session.date}`;

  return (
    <Modal open={true} onClose={onClose} title={title}>
      <div className="session-detail">
        {/* Meta */}
        <div className="session-detail-meta">
          <span className="sd-time">{fmtTime(session.time)}</span>
          {session.status === "completed" && (
            <span className="sc-done-badge" style={{ marginLeft: "0.5rem" }}>✓ Completed</span>
          )}
        </div>

        {/* Body */}
        {editing ? (
          <ExerciseBlockForm
            blocks={blocks}
            onChange={setBlocks}
            notes={notes}
            onNotesChange={setNotes}
          />
        ) : (
          <ExerciseBlockDisplay blocks={blocks} notes={notes} />
        )}

        {/* Actions */}
        <div className="modal-actions" style={{ marginTop: "1rem" }}>
          {!readonly && !editing && (
            <button className="btn-secondary" onClick={() => setEditing(true)}>✏ Edit Notes</button>
          )}
          {editing && (
            <>
              <button className="btn-secondary" onClick={() => { setEditing(false); setBlocks(session.exerciseBlocks?.map(b => ({...b, id: b.id || emptyBlock().id})) || []); setNotes(session.notes || ""); }}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save Notes"}
              </button>
            </>
          )}
          {!editing && (
            <button className="btn-secondary" onClick={onClose}>Close</button>
          )}
        </div>
      </div>
    </Modal>
  );
}
