import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getLoans,
  addLoanTransaction,
  addDocumentWithFile,
  PAYMENT_METHOD_OPTIONS,
  type Loan,
  type PaymentMethod,
} from "../store";
import { useRefresh } from "../App";

export default function AddLoanPayment() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { refresh } = useRefresh();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [form, setForm] = useState({
    loanId: id || "",
    date: new Date().toISOString().split("T")[0],
    amount: "",
    method: "Cash" as PaymentMethod,
    checkNumber: "",
    referenceNumber: "",
    notes: "",
  });
  const [attachment, setAttachment] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ls = await getLoans();
        if (!cancelled)
          setLoans(ls.filter((l) => l.status !== "Written Off" && l.status !== "Paid Off"));
      } catch (e) {
        if (!cancelled) alert((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (id) setForm((f) => ({ ...f, loanId: id }));
  }, [id]);

  const set = (f: string, v: string) => setForm((prev) => ({ ...prev, [f]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.loanId) {
      alert("Please select a loan.");
      return;
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    try {
      setSaving(true);
      const txn = await addLoanTransaction({
        loanId: form.loanId,
        date: form.date,
        type: "payment",
        description: `Payment received (${form.method})`,
        chargeAmount: 0,
        paymentAmount: parseFloat(form.amount),
        paymentMethod: form.method,
        checkNumber: form.checkNumber.trim(),
        referenceNumber: form.referenceNumber.trim(),
        notes: form.notes.trim(),
      });
      if (attachment) {
        const baseName = attachment.name.trim() || "payment-proof";
        await addDocumentWithFile(attachment, {
          documentName: baseName,
          documentType: "Payment Proof",
          relatedType: "loan",
          relatedId: form.loanId,
          notes: `Payment ${form.date} — ${form.method}`,
          loanTransactionId: txn.id,
        });
      }
      refresh();
      alert("Saved. Payment recorded.");
      navigate(id ? `/loans/${id}` : "/loans");
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <button className="back-link" onClick={() => navigate(id ? `/loans/${id}` : "/loans")}>
        ← Back
      </button>
      <div className="page-header">
        <h2>💰 Record Loan Payment</h2>
      </div>
      <div className="card">
        <form onSubmit={handleSubmit}>
          {!id && (
            <div className="form-group">
              <label>Loan *</label>
              <select value={form.loanId} onChange={(e) => set("loanId", e.target.value)}>
                <option value="">Select a loan...</option>
                {loans.map((l) => (
                  <option key={l.id} value={l.id}>
                    Loan to {l.borrowerName}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="form-row">
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
            </div>
            <div className="form-group">
              <label>Amount ($) *</label>
              <input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Payment method</label>
              <select
                value={form.method}
                onChange={(e) => set("method", e.target.value as PaymentMethod)}
              >
                {PAYMENT_METHOD_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {form.method === "Direct deposit" && (
            <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.5, marginBottom: 12 }}>
              If this payment was deposited directly into your bank account, enter it here after checking
              your bank account.
            </p>
          )}
          {form.method === "Check" && (
            <div className="form-group">
              <label>Check number</label>
              <input value={form.checkNumber} onChange={(e) => set("checkNumber", e.target.value)} />
            </div>
          )}
          <div className="form-group">
            <label>Reference number (optional)</label>
            <input
              value={form.referenceNumber}
              onChange={(e) => set("referenceNumber", e.target.value)}
              placeholder="Confirmation, Zelle/Venmo ID, transfer ref…"
            />
          </div>
          <div className="form-group">
            <label>Payment note (optional)</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} style={{ minHeight: 80 }} />
          </div>
          <div className="form-group">
            <label>Attach check photo, receipt, or payment proof (optional)</label>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.heic,.heif,.webp,image/*,application/pdf"
              onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
            />
            <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 8 }}>
              PDF or image. Saved privately in your documents.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
              {saving ? "Saving…" : "Record Payment"}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate(id ? `/loans/${id}` : "/loans")}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
