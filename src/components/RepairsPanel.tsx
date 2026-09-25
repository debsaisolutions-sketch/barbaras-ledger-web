import { useState, type FormEvent } from "react";
import {
  addNote,
  addPropertyExpense,
  deletePropertyExpense,
  updatePropertyExpense,
  PAYMENT_METHOD_OPTIONS,
  PROPERTY_EXPENSE_CATEGORIES,
  type Document as Doc,
  type PropertyExpense,
} from "../store";
import {
  REPAIR_PRIORITIES,
  REPAIR_STATUSES,
  blankMoneyToNull,
  blankMoneyToZero,
  repairSaveError,
  type RepairPriority,
  type RepairStatus,
} from "../rentSchedule";
import { fmtCurrency, fmtDate, statusBadge } from "../helpers";
import { openDocumentInNewTab } from "../documentFiles";
import ConfirmDialog from "./ConfirmDialog";

const emptyForm = () => ({
  expenseDate: new Date().toISOString().split("T")[0],
  category: "Repair",
  title: "",
  description: "",
  vendorName: "",
  amount: "",
  estimatedCost: "",
  priority: "Normal" as RepairPriority,
  workStatus: "Needs Attention" as RepairStatus,
  targetDate: "",
  completedDate: "",
  paymentMethod: "",
  referenceNumber: "",
  notes: "",
});

export default function RepairsPanel({
  propertyId,
  expenses,
  docs,
  onChanged,
}: {
  propertyId: string;
  expenses: PropertyExpense[];
  docs: Doc[];
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PropertyExpense | null>(null);
  const [deleting, setDeleting] = useState(false);

  const startNew = () => {
    setEditingId(null);
    setForm(emptyForm());
    setReceipt(null);
    setOpen(true);
  };

  const startEdit = (ex: PropertyExpense) => {
    setEditingId(ex.id);
    setForm({
      expenseDate: ex.expenseDate,
      category: ex.category || "Repair",
      title: ex.title || ex.description,
      description: ex.title ? ex.description : "",
      vendorName: ex.vendorName,
      amount: ex.amount > 0 ? String(ex.amount) : "",
      estimatedCost: ex.estimatedCost != null ? String(ex.estimatedCost) : "",
      priority: ex.priority,
      workStatus: ex.workStatus,
      targetDate: ex.targetDate,
      completedDate: ex.completedDate,
      paymentMethod: ex.paymentMethod,
      referenceNumber: ex.referenceNumber,
      notes: ex.notes,
    });
    setReceipt(null);
    setOpen(true);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const err = repairSaveError({
      title: form.title,
      description: form.description,
      actualCost: form.amount,
      estimatedCost: form.estimatedCost,
    });
    if (err) {
      alert(err);
      return;
    }
    const payload = {
      expenseDate: form.expenseDate || new Date().toISOString().split("T")[0],
      category: form.category,
      title: form.title.trim() || form.description.trim(),
      description: form.description.trim(),
      vendorName: form.vendorName,
      amount: blankMoneyToZero(form.amount),
      estimatedCost: blankMoneyToNull(form.estimatedCost),
      priority: form.priority,
      workStatus: form.workStatus,
      targetDate: form.targetDate,
      completedDate: form.completedDate,
      paymentMethod: form.paymentMethod,
      referenceNumber: form.referenceNumber,
      notes: form.notes,
    };
    try {
      setSaving(true);
      if (editingId) await updatePropertyExpense(editingId, payload);
      else await addPropertyExpense(propertyId, payload, receipt);
      setOpen(false);
      onChanged();
    } catch (error) {
      alert((error as Error).message || "Could not save repair.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      setDeleting(true);
      await deletePropertyExpense(pendingDelete.id);
      setPendingDelete(null);
      onChanged();
    } catch (error) {
      alert((error as Error).message || "Could not delete repair.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>Repairs &amp; maintenance</h3>
        <button type="button" className="btn btn-primary" onClick={startNew}>
          Add repair
        </button>
      </div>
      <p style={{ color: "var(--muted)", marginBottom: 14, lineHeight: 1.5 }}>
        Save a repair before you know the price. Add the actual cost later, on the same item, when money is spent.
      </p>
      {expenses.length === 0 ? (
        <p style={{ color: "var(--muted)", margin: 0 }}>No repairs yet.</p>
      ) : (
        expenses.map((ex) => {
          const title = ex.title || ex.description || "Repair";
          const receiptDoc = ex.documentId ? docs.find((d) => d.id === ex.documentId) : undefined;
          return (
            <div key={ex.id} style={{ borderTop: "1px solid var(--border)", padding: "12px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <strong>{title}</strong>
                <span className={`badge ${statusBadge(ex.workStatus)}`}>{ex.workStatus}</span>
              </div>
              <div style={{ color: "var(--muted)", marginTop: 4, fontSize: 14 }}>
                Reported {fmtDate(ex.expenseDate)}
                {ex.priority ? ` · ${ex.priority} priority` : ""}
                {ex.targetDate ? ` · Target ${fmtDate(ex.targetDate)}` : ""}
              </div>
              {ex.description && ex.title ? (
                <p style={{ whiteSpace: "pre-wrap", margin: "8px 0" }}>{ex.description}</p>
              ) : null}
              <div style={{ fontSize: 15, marginTop: 6 }}>
                {ex.estimatedCost != null ? `Estimate ${fmtCurrency(ex.estimatedCost)}` : "No estimate"}
                {" · "}
                {ex.amount > 0 ? `Spent ${fmtCurrency(ex.amount)}` : "No cost yet"}
                {ex.vendorName ? ` · ${ex.vendorName}` : ""}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => startEdit(ex)}>
                  Edit
                </button>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => setPendingDelete(ex)}>
                  Delete
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    const text = window.prompt("Note about this repair");
                    if (!text || !text.trim()) return;
                    void addNote({
                      relatedType: "repair",
                      relatedId: ex.id,
                      propertyId,
                      noteDate: new Date().toISOString().split("T")[0],
                      noteText: text.trim(),
                      reminderDate: "",
                    })
                      .then(onChanged)
                      .catch((error) => alert((error as Error).message || "Could not save note."));
                  }}
                >
                  Add note
                </button>
                {receiptDoc?.storagePath ? (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={async () => {
                      const ok = await openDocumentInNewTab(receiptDoc.storagePath!);
                      if (!ok) alert("Could not open receipt.");
                    }}
                  >
                    View receipt
                  </button>
                ) : null}
              </div>
            </div>
          );
        })
      )}

      {open && (
        <div className="modal-overlay" onClick={() => !saving && setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "90vh", overflowY: "auto" }}>
            <h3>{editingId ? "Edit repair" : "Add repair"}</h3>
            <form onSubmit={(e) => void save(e)}>
              <div className="form-group">
                <label>Repair needed *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Replace back porch railing"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={form.workStatus}
                    onChange={(e) => setForm((f) => ({ ...f, workStatus: e.target.value as RepairStatus }))}
                  >
                    {REPAIR_STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as RepairPriority }))}
                  >
                    {REPAIR_PRIORITIES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Date reported</label>
                <input
                  type="date"
                  value={form.expenseDate}
                  onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  style={{ minHeight: 72 }}
                />
              </div>
              <details>
                <summary style={{ cursor: "pointer", fontWeight: 700, marginBottom: 12 }}>
                  Cost, vendor, and dates (optional)
                </summary>
                <div className="form-row">
                  <div className="form-group">
                    <label>Estimated cost</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={form.estimatedCost}
                      placeholder="Leave blank if unknown"
                      onChange={(e) => setForm((f) => ({ ...f, estimatedCost: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Actual cost</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={form.amount}
                      placeholder="Leave blank until paid"
                      onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                    {PROPERTY_EXPENSE_CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Vendor</label>
                  <input value={form.vendorName} onChange={(e) => setForm((f) => ({ ...f, vendorName: e.target.value }))} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Target date</label>
                    <input
                      type="date"
                      value={form.targetDate}
                      onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Completed date</label>
                    <input
                      type="date"
                      value={form.completedDate}
                      onChange={(e) => setForm((f) => ({ ...f, completedDate: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>How it was paid</label>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                  >
                    <option value="">—</option>
                    {PAYMENT_METHOD_OPTIONS.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Reference number</label>
                  <input
                    value={form.referenceNumber}
                    onChange={(e) => setForm((f) => ({ ...f, referenceNumber: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Extra notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    style={{ minHeight: 64 }}
                  />
                </div>
                {!editingId && (
                  <div className="form-group">
                    <label>Receipt (optional)</label>
                    <input type="file" accept="image/*,.pdf" onChange={(e) => setReceipt(e.target.files?.[0] ?? null)} />
                  </div>
                )}
              </details>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setOpen(false)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving…" : "Save repair"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete this repair?"
          confirmLabel="Delete repair"
          danger
          busy={deleting}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => void confirmDelete()}
        >
          <p style={{ marginTop: 0 }}>
            {pendingDelete.amount > 0
              ? `This repair has ${fmtCurrency(pendingDelete.amount)} recorded as spent. Deleting it removes that expense from your records.`
              : "This removes the repair from your list. No payment is changed."}
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}
