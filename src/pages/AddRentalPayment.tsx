import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getProperties,
  addPropertyTransaction,
  addDocumentWithFile,
  PAYMENT_METHOD_OPTIONS,
  type Property,
  type PaymentMethod,
  type ApplyTo,
} from "../store";
import { useRefresh } from "../App";

export default function AddRentalPayment() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { refresh } = useRefresh();
  const [properties, setProperties] = useState<Property[]>([]);
  const [form, setForm] = useState({
    propertyId: id || "",
    date: new Date().toISOString().split("T")[0],
    amount: "",
    method: "Cash" as PaymentMethod,
    checkNumber: "",
    referenceNumber: "",
    applyTo: "Rent" as ApplyTo,
    notes: "",
  });
  const [attachment, setAttachment] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const props = await getProperties();
        if (!cancelled)
          setProperties(
            props.filter((p) => p.status !== "Closed" && p.status !== "Sold")
          );
      } catch (e) {
        if (!cancelled) alert((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (id) setForm((f) => ({ ...f, propertyId: id }));
  }, [id]);

  const set = (f: string, v: string) => setForm((prev) => ({ ...prev, [f]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.propertyId) {
      alert("Please select a property.");
      return;
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    try {
      setSaving(true);
      const txn = await addPropertyTransaction({
        propertyId: form.propertyId,
        date: form.date,
        type: "payment",
        description: `Rent payment (${form.method})`,
        chargeAmount: 0,
        paymentAmount: parseFloat(form.amount),
        paymentMethod: form.method,
        checkNumber: form.checkNumber.trim(),
        referenceNumber: form.referenceNumber.trim(),
        applyTo: form.applyTo,
        notes: form.notes.trim(),
      });
      if (attachment) {
        const baseName = attachment.name.trim() || "payment-proof";
        await addDocumentWithFile(attachment, {
          documentName: baseName,
          documentType: "Payment Proof",
          relatedType: "property",
          relatedId: form.propertyId,
          notes: `Payment ${form.date} — ${form.method}`,
          propertyTransactionId: txn.id,
        });
      }
      refresh();
      alert("Saved. Payment recorded.");
      navigate(id ? `/properties/${id}` : "/properties");
    } catch (err) {
      alert((err as Error).message || "Could not save payment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <button className="back-link" onClick={() => navigate(id ? `/properties/${id}` : "/properties")}>
        ← Back
      </button>
      <div className="page-header">
        <h2>💰 Record Rental Payment</h2>
      </div>
      <div className="card">
        <form onSubmit={handleSubmit}>
          {!id && (
            <div className="form-group">
              <label>Property *</label>
              <select value={form.propertyId} onChange={(e) => set("propertyId", e.target.value)}>
                <option value="">Select a property...</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.propertyName} — {p.tenantName}
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
            <div className="form-group">
              <label>Apply to</label>
              <select value={form.applyTo} onChange={(e) => set("applyTo", e.target.value)}>
                <option>Rent</option>
                <option>Late Fee</option>
                <option>Other Charge</option>
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
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              style={{ minHeight: 80 }}
            />
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
              onClick={() => navigate(id ? `/properties/${id}` : "/properties")}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
