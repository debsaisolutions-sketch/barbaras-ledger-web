import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getLoan, addLoan, updateLoan, type LoanStatus } from "../store";
import { useRefresh } from "../App";

export default function LoanForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { refresh } = useRefresh();
  const isEdit = !!id;

  const [form, setForm] = useState({
    borrowerName: "",
    borrowerPhone: "",
    borrowerEmail: "",
    relationship: "",
    originalAmount: "",
    loanDate: "",
    interestRate: "0",
    paymentDueDate: "",
    expectedMonthlyPayment: "",
    status: "Active" as LoanStatus,
    notes: "",
    nextReminderDate: "",
    reminderNote: "",
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [initialReminder, setInitialReminder] = useState({ date: "", note: "" });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const l = await getLoan(id);
        if (cancelled || !l) return;
        setForm({
          borrowerName: l.borrowerName,
          borrowerPhone: l.borrowerPhone,
          borrowerEmail: l.borrowerEmail,
          relationship: l.relationship,
          originalAmount: l.originalAmount.toString(),
          loanDate: l.loanDate,
          interestRate: l.interestRate.toString(),
          paymentDueDate: l.paymentDueDate,
          expectedMonthlyPayment: l.expectedMonthlyPayment.toString(),
          status: l.status,
          notes: l.notes,
          nextReminderDate: l.nextReminderDate,
          reminderNote: l.reminderNote,
        });
        setInitialReminder({ date: l.nextReminderDate, note: l.reminderNote });
      } catch (e) {
        if (!cancelled) alert((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const set = (f: string, v: string) => setForm((prev) => ({ ...prev, [f]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.borrowerName.trim()) {
      alert("Borrower name is required.");
      return;
    }
    const reminderDate = form.nextReminderDate;
    const reminderNote = form.reminderNote.trim();
    const reminderChanged =
      isEdit &&
      (reminderDate !== initialReminder.date || reminderNote !== initialReminder.note.trim());
    const data = {
      borrowerName: form.borrowerName.trim(),
      borrowerPhone: form.borrowerPhone.trim(),
      borrowerEmail: form.borrowerEmail.trim(),
      relationship: form.relationship.trim(),
      originalAmount: parseFloat(form.originalAmount) || 0,
      loanDate: form.loanDate,
      interestRate: parseFloat(form.interestRate) || 0,
      paymentDueDate: form.paymentDueDate,
      expectedMonthlyPayment: parseFloat(form.expectedMonthlyPayment) || 0,
      status: form.status,
      notes: form.notes.trim(),
      nextReminderDate: reminderDate,
      reminderNote,
      reminderCompleted: false,
      reminderCompletedAt: "",
    };
    try {
      setSaving(true);
      if (isEdit) {
        await updateLoan(id!, {
          ...data,
          reminderCompleted: reminderChanged ? false : undefined,
          reminderCompletedAt: reminderChanged ? "" : undefined,
        });
      } else await addLoan(data);
      refresh();
      alert(isEdit ? "Saved. Loan updated." : "Saved. Loan added.");
      navigate(isEdit ? `/loans/${id}` : "/loans");
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="empty-state" style={{ padding: 40 }}>
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div>
      <button className="back-link" onClick={() => navigate(isEdit ? `/loans/${id}` : "/loans")}>
        ← Back
      </button>
      <div className="page-header">
        <h2>{isEdit ? "Edit Loan" : "Add New Loan"}</h2>
      </div>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Borrower Name *</label>
            <input value={form.borrowerName} onChange={(e) => set("borrowerName", e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Phone</label>
              <input value={form.borrowerPhone} onChange={(e) => set("borrowerPhone", e.target.value)} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={form.borrowerEmail} onChange={(e) => set("borrowerEmail", e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Relationship</label>
              <input
                value={form.relationship}
                onChange={(e) => set("relationship", e.target.value)}
                placeholder="e.g., Friend, Family"
              />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option>Active</option>
                <option>Past Due</option>
                <option>Paid Off</option>
                <option>Written Off</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Original Amount ($)</label>
              <input
                type="number"
                step="0.01"
                value={form.originalAmount}
                onChange={(e) => set("originalAmount", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Loan Date</label>
              <input type="date" value={form.loanDate} onChange={(e) => set("loanDate", e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Interest Rate (%)</label>
              <input
                type="number"
                step="0.01"
                value={form.interestRate}
                onChange={(e) => set("interestRate", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Expected Monthly Payment ($)</label>
              <input
                type="number"
                step="0.01"
                value={form.expectedMonthlyPayment}
                onChange={(e) => set("expectedMonthlyPayment", e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Payment Due Date</label>
            <input type="date" value={form.paymentDueDate} onChange={(e) => set("paymentDueDate", e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Next reminder date</label>
              <input
                type="date"
                value={form.nextReminderDate}
                onChange={(e) => set("nextReminderDate", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Reminder note</label>
              <input
                value={form.reminderNote}
                onChange={(e) => set("reminderNote", e.target.value)}
                placeholder="e.g. Check account for payment"
              />
            </div>
          </div>
          <p style={{ color: "var(--muted)", fontSize: 14, marginTop: -8, marginBottom: 16 }}>
            Use reminders for things you need to check or follow up on, like checking your bank
            account for a direct deposit.
          </p>
          <div className="form-group">
            <label>Notes</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Loan"}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => navigate(isEdit ? `/loans/${id}` : "/loans")}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
