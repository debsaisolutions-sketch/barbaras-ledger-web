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
    borrowerName: "", borrowerPhone: "", borrowerEmail: "", relationship: "",
    originalAmount: "", loanDate: "", interestRate: "0", paymentDueDate: "",
    expectedMonthlyPayment: "", status: "Active" as LoanStatus, notes: "",
  });

  useEffect(() => {
    if (id) {
      const l = getLoan(id);
      if (l) setForm({
        borrowerName: l.borrowerName, borrowerPhone: l.borrowerPhone, borrowerEmail: l.borrowerEmail,
        relationship: l.relationship, originalAmount: l.originalAmount.toString(), loanDate: l.loanDate,
        interestRate: l.interestRate.toString(), paymentDueDate: l.paymentDueDate,
        expectedMonthlyPayment: l.expectedMonthlyPayment.toString(), status: l.status, notes: l.notes,
      });
    }
  }, [id]);

  const set = (f: string, v: string) => setForm(prev => ({ ...prev, [f]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.borrowerName.trim()) { alert("Borrower name is required."); return; }
    const data = {
      borrowerName: form.borrowerName.trim(), borrowerPhone: form.borrowerPhone.trim(),
      borrowerEmail: form.borrowerEmail.trim(), relationship: form.relationship.trim(),
      originalAmount: parseFloat(form.originalAmount) || 0, loanDate: form.loanDate,
      interestRate: parseFloat(form.interestRate) || 0, paymentDueDate: form.paymentDueDate,
      expectedMonthlyPayment: parseFloat(form.expectedMonthlyPayment) || 0, status: form.status, notes: form.notes.trim(),
    };
    if (isEdit) { updateLoan(id!, data); } else { addLoan(data); }
    refresh();
    alert(isEdit ? "Loan updated!" : "Loan added!");
    navigate(isEdit ? `/loans/${id}` : "/loans");
  };

  return (
    <div>
      <button className="back-link" onClick={() => navigate(isEdit ? `/loans/${id}` : "/loans")}>← Back</button>
      <div className="page-header"><h2>{isEdit ? "Edit Loan" : "Add New Loan"}</h2></div>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group"><label>Borrower Name *</label><input value={form.borrowerName} onChange={e => set("borrowerName", e.target.value)} /></div>
          <div className="form-row">
            <div className="form-group"><label>Phone</label><input value={form.borrowerPhone} onChange={e => set("borrowerPhone", e.target.value)} /></div>
            <div className="form-group"><label>Email</label><input type="email" value={form.borrowerEmail} onChange={e => set("borrowerEmail", e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Relationship</label><input value={form.relationship} onChange={e => set("relationship", e.target.value)} placeholder="e.g., Friend, Family" /></div>
            <div className="form-group"><label>Status</label>
              <select value={form.status} onChange={e => set("status", e.target.value)}>
                <option>Active</option><option>Past Due</option><option>Paid Off</option><option>Written Off</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Original Amount ($)</label><input type="number" step="0.01" value={form.originalAmount} onChange={e => set("originalAmount", e.target.value)} /></div>
            <div className="form-group"><label>Loan Date</label><input type="date" value={form.loanDate} onChange={e => set("loanDate", e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Interest Rate (%)</label><input type="number" step="0.01" value={form.interestRate} onChange={e => set("interestRate", e.target.value)} /></div>
            <div className="form-group"><label>Expected Monthly Payment ($)</label><input type="number" step="0.01" value={form.expectedMonthlyPayment} onChange={e => set("expectedMonthlyPayment", e.target.value)} /></div>
          </div>
          <div className="form-group"><label>Payment Due Date</label><input type="date" value={form.paymentDueDate} onChange={e => set("paymentDueDate", e.target.value)} /></div>
          <div className="form-group"><label>Notes</label><textarea value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
          <div style={{ display: "flex", gap: 12 }}>
            <button type="submit" className="btn btn-primary btn-lg">{isEdit ? "Save Changes" : "Add Loan"}</button>
            <button type="button" className="btn btn-outline" onClick={() => navigate(isEdit ? `/loans/${id}` : "/loans")}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
