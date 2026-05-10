import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getLoans, addLoanTransaction, type Loan, type PaymentMethod } from "../store";
import { useRefresh } from "../App";

export default function AddLoanPayment() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { refresh } = useRefresh();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [form, setForm] = useState({
    loanId: id || "", date: new Date().toISOString().split("T")[0],
    amount: "", method: "Cash" as PaymentMethod, checkNumber: "", notes: "",
  });

  useEffect(() => { setLoans(getLoans().filter(l => l.status !== "Written Off" && l.status !== "Paid Off")); }, []);
  useEffect(() => { if (id) setForm(f => ({ ...f, loanId: id })); }, [id]);
  const set = (f: string, v: string) => setForm(prev => ({ ...prev, [f]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.loanId) { alert("Please select a loan."); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { alert("Please enter a valid amount."); return; }
    addLoanTransaction({
      loanId: form.loanId, date: form.date, type: "payment",
      description: `Payment received (${form.method})`, chargeAmount: 0,
      paymentAmount: parseFloat(form.amount), paymentMethod: form.method,
      checkNumber: form.checkNumber.trim(), notes: form.notes.trim(),
    });
    refresh(); alert("Payment recorded!");
    navigate(id ? `/loans/${id}` : "/loans");
  };

  return (
    <div>
      <button className="back-link" onClick={() => navigate(id ? `/loans/${id}` : "/loans")}>← Back</button>
      <div className="page-header"><h2>💰 Record Loan Payment</h2></div>
      <div className="card">
        <form onSubmit={handleSubmit}>
          {!id && (
            <div className="form-group"><label>Loan *</label>
              <select value={form.loanId} onChange={e => set("loanId", e.target.value)}>
                <option value="">Select a loan...</option>
                {loans.map(l => <option key={l.id} value={l.id}>Loan to {l.borrowerName}</option>)}
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
            {form.method === "Check" && <div className="form-group"><label>Check Number</label><input value={form.checkNumber} onChange={e => set("checkNumber", e.target.value)} /></div>}
          </div>
          <div className="form-group"><label>Notes</label><textarea value={form.notes} onChange={e => set("notes", e.target.value)} style={{ minHeight: 80 }} /></div>
          <div style={{ display: "flex", gap: 12 }}>
            <button type="submit" className="btn btn-primary btn-lg">Record Payment</button>
            <button type="button" className="btn btn-outline" onClick={() => navigate(id ? `/loans/${id}` : "/loans")}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
