import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { addLoanTransaction } from "../store";
import { useRefresh } from "../App";

export default function AddLoanCharge() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { refresh } = useRefresh();
  const [form, setForm] = useState({ date: new Date().toISOString().split("T")[0], amount: "", description: "", notes: "" });
  const set = (f: string, v: string) => setForm(prev => ({ ...prev, [f]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) { alert("Please enter a valid amount."); return; }
    addLoanTransaction({
      loanId: id!, date: form.date, type: "charge",
      description: form.description.trim() || "Additional charge",
      chargeAmount: parseFloat(form.amount), paymentAmount: 0,
      paymentMethod: "", checkNumber: "", notes: form.notes.trim(),
    });
    refresh(); alert("Charge added!"); navigate(`/loans/${id}`);
  };

  return (
    <div>
      <button className="back-link" onClick={() => navigate(`/loans/${id}`)}>← Back</button>
      <div className="page-header"><h2>📋 Add Loan Charge</h2></div>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group"><label>Date</label><input type="date" value={form.date} onChange={e => set("date", e.target.value)} /></div>
            <div className="form-group"><label>Amount ($) *</label><input type="number" step="0.01" value={form.amount} onChange={e => set("amount", e.target.value)} placeholder="0.00" /></div>
          </div>
          <div className="form-group"><label>Description</label><input value={form.description} onChange={e => set("description", e.target.value)} placeholder="e.g., Interest charge, Additional loan" /></div>
          <div className="form-group"><label>Notes</label><textarea value={form.notes} onChange={e => set("notes", e.target.value)} style={{ minHeight: 80 }} /></div>
          <div style={{ display: "flex", gap: 12 }}>
            <button type="submit" className="btn btn-primary btn-lg">Add Charge</button>
            <button type="button" className="btn btn-outline" onClick={() => navigate(`/loans/${id}`)}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
