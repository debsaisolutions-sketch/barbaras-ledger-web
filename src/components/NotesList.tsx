import { useState, type FormEvent } from "react";
import { deleteNote, updateNote, type Note } from "../store";
import { noteSaveError } from "../rentSchedule";
import { fmtDate } from "../helpers";
import ConfirmDialog from "./ConfirmDialog";

const ABOUT: Record<string, string> = {
  property: "Property",
  tenant: "Tenant",
  loan: "Loan",
  payment: "Payment",
  repair: "Repair",
  general: "General",
};

export default function NotesList({ notes, onChanged }: { notes: Note[]; onChanged: () => void }) {
  const [editing, setEditing] = useState<Note | null>(null);
  const [draft, setDraft] = useState({ noteDate: "", noteText: "", reminderDate: "" });
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Note | null>(null);
  const [deleting, setDeleting] = useState(false);

  const startEdit = (note: Note) => {
    setEditing(note);
    setDraft({
      noteDate: note.noteDate,
      noteText: note.noteText,
      reminderDate: note.reminderDate,
    });
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const err = noteSaveError(draft.noteText);
    if (err) {
      alert(err);
      return;
    }
    try {
      setSaving(true);
      await updateNote(editing.id, {
        noteDate: draft.noteDate,
        noteText: draft.noteText.trim(),
        reminderDate: draft.reminderDate,
      });
      setEditing(null);
      onChanged();
    } catch (error) {
      alert((error as Error).message || "Could not save note.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      setDeleting(true);
      await deleteNote(pendingDelete.id);
      setPendingDelete(null);
      onChanged();
    } catch (error) {
      alert((error as Error).message || "Could not delete note.");
    } finally {
      setDeleting(false);
    }
  };

  if (notes.length === 0) {
    return (
      <div className="empty-state">
        <p>No notes yet.</p>
      </div>
    );
  }

  return (
    <div>
      {notes.map((n) => (
        <div key={n.id} className="card">
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>
            {fmtDate(n.noteDate)}
            {n.relatedType !== "property" && n.relatedType !== "loan" ? ` · ${ABOUT[n.relatedType] || n.relatedType}` : ""}
            {n.reminderDate ? ` · Reminder: ${fmtDate(n.reminderDate)}` : ""}
          </div>
          <div style={{ fontSize: 16, whiteSpace: "pre-wrap" }}>{n.noteText}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => startEdit(n)}>
              Edit
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={() => setPendingDelete(n)}>
              Delete
            </button>
          </div>
        </div>
      ))}

      {editing && (
        <div className="modal-overlay" onClick={() => !saving && setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit note</h3>
            <form onSubmit={(e) => void save(e)}>
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={draft.noteDate}
                  onChange={(e) => setDraft((d) => ({ ...d, noteDate: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Note</label>
                <textarea
                  value={draft.noteText}
                  onChange={(e) => setDraft((d) => ({ ...d, noteText: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Reminder date (optional)</label>
                <input
                  type="date"
                  value={draft.reminderDate}
                  onChange={(e) => setDraft((d) => ({ ...d, reminderDate: e.target.value }))}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setEditing(null)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete this note?"
          confirmLabel="Delete note"
          danger
          busy={deleting}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => void confirmDelete()}
        >
          <p style={{ margin: 0 }}>This removes the note. Rent payments and expenses are not changed.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
