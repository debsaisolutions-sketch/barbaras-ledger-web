import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { addPropertyTransaction } from "../store";
import { useRefresh } from "../App";

export default function AddLateFee() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { refresh } = useRefresh();
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    amount: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (f: string, v: string) => setForm((prev) => ({ ...prev, [f]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    try {
      setSaving(true);
      await addPropertyTransaction({
        propertyId: id!,
        date: form.date,
        type: "late_fee",
        description: "Late fee charge",
        chargeAmount: parseFloat(form.amount),
        paymentAmount: 0,
        paymentMethod: "",
        checkNumber: "",
        referenceNumber: "",
        applyTo: "Late Fee",
        notes: form.notes.trim(),
      });
      refresh();
      alert("Saved. Late fee added.");
      navigate(`/properties/${id}`);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <button className="back-link" onClick={() => navigate(`/properties/${id}`)}>
        ← Back
      </button>
      <div className="page-header">
        <h2>⚠️ Add Late Fee</h2>
      </div>
      <div className="card">
        <form onSubmit={handleSubmit}>
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
          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              style={{ minHeight: 80 }}
            />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
              {saving ? "Saving…" : "Add Late Fee"}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => navigate(`/properties/${id}`)}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
