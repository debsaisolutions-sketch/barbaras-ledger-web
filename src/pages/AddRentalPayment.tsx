import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProperties, addPropertyTransaction, type Property, type PaymentMethod, type ApplyTo } from "../store";
import { useRefresh } from "../App";

export default function AddRentalPayment() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { refresh } = useRefresh();
  const [properties, setProperties] = useState<Property[]>([]);
  const [form, setForm] = useState({
    propertyId: id || "", date: new Date().toISOString().split("T")[0],
    amount: "", method: "Cash" as PaymentMethod, checkNumber: "", applyTo: "Rent" as ApplyTo, notes: "",
  });

  useEffect(() => { setProperties(getProperties().filter(p => p.status !== "Closed")); }, []);
  useEffect(() => { if (id) setForm(f => ({ ...f, propertyId: id })); }, [id]);

  const set = (f: string, v: string) => setForm(prev => ({ ...prev, [f]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.propertyId) { alert("Please select a property."); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { alert("Please enter a valid amount."); return; }
    addPropertyTransaction({
      propertyId: form.propertyId, date: form.date, type: "payment",
      description: `Rent payment (${form.method})`, chargeAmount: 0,
      paymentAmount: parseFloat(form.amount), paymentMethod: form.method,
      checkNumber: form.checkNumber.trim(), applyTo: form.applyTo, notes: form.notes.trim(),
    });
    refresh();
    alert("Payment recorded!");
    navigate(id ? `/properties/${id}` : "/properties");
  };

  return (
    <div>
      <button className="back-link" onClick={() => navigate(id ? `/properties/${id}` : "/properties")}>← Back</button>
      <div className="page-header"><h2>💰 Record Rental Payment</h2></div>
      <div className="card">
        <form onSubmit={handleSubmit}>
          {!id && (
            <div className="form-group"><label>Property *</label>
              <select value={form.propertyId} onChange={e => set("propertyId", e.target.value)}>
                <option value="">Select a property...</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.propertyName} — {p.tenantName}</option>)}
              </select>
            </div>
          )}
          <div className="form-row">
            <div className="form-group"><label>Date</label><input type="date" value={form.date} onChange={e => set("date", e.target.value)} /></div>
            <div className="form-group"><label>Amount ($) *</label><input type="number" step="0.01" value={form.amount} onChange={e => set("amount", e.target.value)} placeholder="0.00" /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Payment Method</label>
              <select value={form.method} onChange={e => set("method", e.target.value)}>
                <option>Cash</option><option>Check</option><option>Bank Transfer</option><option>Other</option>
              </select>
            </div>
            <div className="form-group"><label>Apply To</label>
              <select value={form.applyTo} onChange={e => set("applyTo", e.target.value)}>
                <option>Rent</option><option>Late Fee</option><option>Other Charge</option>
              </select>
            </div>
          </div>
          {form.method === "Check" && <div className="form-group"><label>Check Number</label><input value={form.checkNumber} onChange={e => set("checkNumber", e.target.value)} /></div>}
          <div className="form-group"><label>Notes</label><textarea value={form.notes} onChange={e => set("notes", e.target.value)} style={{ minHeight: 80 }} /></div>
          <div style={{ display: "flex", gap: 12 }}>
            <button type="submit" className="btn btn-primary btn-lg">Record Payment</button>
            <button type="button" className="btn btn-outline" onClick={() => navigate(id ? `/properties/${id}` : "/properties")}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
