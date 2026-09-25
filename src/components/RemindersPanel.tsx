import { useEffect, useState, type FormEvent } from "react";
import {
  addReminder,
  clearLoanReminder,
  clearPropertyReminder,
  completeReminder,
  deleteReminder,
  dismissLoanReminder,
  dismissPropertyReminder,
  dismissReminder,
  markLoanReminderDone,
  markPropertyReminderDone,
  updateProperty,
  updateLoan,
  updateReminder,
  type Loan,
  type Property,
  type Reminder,
  type ReminderRelatedType,
} from "../store";
import { reminderSaveError } from "../rentSchedule";
import { fmtDate } from "../helpers";
import ConfirmDialog from "./ConfirmDialog";

type Draft = { dueDate: string; note: string; relatedType: ReminderRelatedType; relatedId: string };

export default function RemindersPanel({
  property,
  loan,
  reminders,
  startOpen = false,
  hideLegacy = false,
  onStartOpenHandled,
  onChanged,
}: {
  property?: Property;
  loan?: Loan;
  reminders: Reminder[];
  startOpen?: boolean;
  hideLegacy?: boolean;
  onStartOpenHandled?: () => void;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [editingLegacy, setEditingLegacy] = useState(false);
  const [draft, setDraft] = useState<Draft>({ dueDate: "", note: "", relatedType: "general", relatedId: "" });
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<null | { kind: "reminder" | "legacy"; id: string }>(null);
  const [busy, setBusy] = useState(false);

  const scoped = reminders.filter((r) => {
    if (property) return r.propertyId === property.id;
    if (loan) return r.loanId === loan.id;
    return r.relatedType === "general" && !r.propertyId && !r.loanId;
  });

  const legacy = hideLegacy
    ? null
    : property
    ? property.nextReminderDate && !property.reminderDismissed
      ? { date: property.nextReminderDate, note: property.reminderNote, done: property.reminderCompleted }
      : null
    : loan && loan.nextReminderDate && !loan.reminderDismissed
      ? { date: loan.nextReminderDate, note: loan.reminderNote, done: loan.reminderCompleted }
      : null;

  useEffect(() => {
    if (!startOpen) return;
    setEditing(null);
    setEditingLegacy(false);
    setDraft({
      dueDate: "",
      note: "",
      relatedType: property ? "property" : loan ? "loan" : "general",
      relatedId: property?.id || loan?.id || "",
    });
    setOpen(true);
    onStartOpenHandled?.();
  }, [startOpen, property, loan, onStartOpenHandled]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const err = reminderSaveError(draft.dueDate);
    if (err) {
      alert(err);
      return;
    }
    try {
      setSaving(true);
      if (editingLegacy && property) {
        await updateProperty(property.id, {
          nextReminderDate: draft.dueDate,
          reminderNote: draft.note.trim(),
          reminderCompleted: false,
          reminderCompletedAt: "",
          reminderDismissed: false,
        });
      } else if (editingLegacy && loan) {
        await updateLoan(loan.id, {
          nextReminderDate: draft.dueDate,
          reminderNote: draft.note.trim(),
          reminderCompleted: false,
          reminderCompletedAt: "",
          reminderDismissed: false,
        });
      } else if (editing) {
        await updateReminder(editing.id, { dueDate: draft.dueDate, note: draft.note });
      } else {
        await addReminder({
          dueDate: draft.dueDate,
          note: draft.note.trim(),
          relatedType: draft.relatedType,
          relatedId: draft.relatedId,
          propertyId: property?.id ?? null,
          loanId: loan?.id ?? null,
        });
      }
      setOpen(false);
      onChanged();
    } catch (error) {
      alert((error as Error).message || "Could not save reminder.");
    } finally {
      setSaving(false);
    }
  };

  const run = async (work: () => Promise<void>) => {
    try {
      setBusy(true);
      await work();
      onChanged();
    } catch (error) {
      alert((error as Error).message || "Could not update reminder.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" id="reminders" style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>Reminders</h3>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => {
            setEditing(null);
            setEditingLegacy(false);
            setDraft({
              dueDate: "",
              note: "",
              relatedType: property ? "property" : loan ? "loan" : "general",
              relatedId: property?.id || loan?.id || "",
            });
            setOpen(true);
          }}
        >
          Add reminder
        </button>
      </div>
      {!legacy && scoped.length === 0 ? (
        <p style={{ color: "var(--muted)", marginBottom: 0 }}>No reminders yet.</p>
      ) : null}
      {legacy && (
        <ReminderRow
          date={legacy.date}
          note={legacy.note}
          status={legacy.done ? "Done" : "Open"}
          busy={busy}
          onEdit={() => {
            setEditingLegacy(true);
            setEditing(null);
            setDraft({
              dueDate: legacy.date,
              note: legacy.note,
              relatedType: property ? "property" : "loan",
              relatedId: property?.id || loan?.id || "",
            });
            setOpen(true);
          }}
          onComplete={
            legacy.done
              ? undefined
              : () =>
                  void run(async () => {
                    if (property) await markPropertyReminderDone(property.id);
                    else if (loan) await markLoanReminderDone(loan.id);
                  })
          }
          onDismiss={() =>
            void run(async () => {
              if (property) await dismissPropertyReminder(property.id);
              else if (loan) await dismissLoanReminder(loan.id);
            })
          }
          onDelete={() => setPendingDelete({ kind: "legacy", id: property?.id || loan?.id || "" })}
        />
      )}
      {scoped.map((r) => (
        <ReminderRow
          key={r.id}
          date={r.dueDate}
          note={r.note}
          status={r.status === "open" ? "Open" : r.status === "completed" ? "Done" : "Dismissed"}
          busy={busy}
          onEdit={() => {
            setEditing(r);
            setEditingLegacy(false);
            setDraft({ dueDate: r.dueDate, note: r.note, relatedType: r.relatedType, relatedId: r.relatedId });
            setOpen(true);
          }}
          onComplete={r.status === "open" ? () => void run(() => completeReminder(r.id)) : undefined}
          onDismiss={r.status === "open" ? () => void run(() => dismissReminder(r.id)) : undefined}
          onDelete={() => setPendingDelete({ kind: "reminder", id: r.id })}
        />
      ))}

      {open && (
        <div className="modal-overlay" onClick={() => !saving && setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editing || editingLegacy ? "Edit reminder" : "Add reminder"}</h3>
            <form onSubmit={(e) => void save(e)}>
              <div className="form-group">
                <label>Due date *</label>
                <input
                  type="date"
                  value={draft.dueDate}
                  onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={draft.note}
                  onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
                  style={{ minHeight: 80 }}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setOpen(false)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving…" : "Save reminder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete this reminder?"
          confirmLabel="Delete reminder"
          danger
          busy={busy}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() =>
            void run(async () => {
              if (pendingDelete.kind === "reminder") await deleteReminder(pendingDelete.id);
              else if (property) await clearPropertyReminder(property.id);
              else if (loan) await clearLoanReminder(loan.id);
              setPendingDelete(null);
            })
          }
        >
          <p style={{ margin: 0 }}>This removes the reminder. Payments and repairs stay as they are.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}

function ReminderRow({
  date,
  note,
  status,
  busy,
  onEdit,
  onComplete,
  onDismiss,
  onDelete,
}: {
  date: string;
  note: string;
  status: string;
  busy: boolean;
  onEdit: () => void;
  onComplete?: () => void;
  onDismiss?: () => void;
  onDelete: () => void;
}) {
  return (
    <div style={{ borderTop: "1px solid var(--border)", padding: "12px 0" }}>
      <div style={{ fontWeight: 700 }}>{fmtDate(date)}</div>
      <div style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>{note || "—"}</div>
      <div style={{ color: "var(--muted)", marginTop: 4 }}>{status}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        <button type="button" className="btn btn-outline btn-sm" onClick={onEdit} disabled={busy}>
          Edit
        </button>
        {onComplete && (
          <button type="button" className="btn btn-primary btn-sm" onClick={onComplete} disabled={busy}>
            Mark complete
          </button>
        )}
        {onDismiss && (
          <button type="button" className="btn btn-outline btn-sm" onClick={onDismiss} disabled={busy}>
            Dismiss
          </button>
        )}
        <button type="button" className="btn btn-danger btn-sm" onClick={onDelete} disabled={busy}>
          Delete
        </button>
      </div>
    </div>
  );
}
