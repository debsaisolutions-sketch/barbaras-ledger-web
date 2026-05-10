import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getLoans, getAllLoanTransactions, calculateLoanBalance, type Loan } from "../store";
import { fmtCurrency, statusBadge } from "../helpers";
import { useRefresh } from "../App";

export default function Loans() {
  const navigate = useNavigate();
  const { key } = useRefresh();
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loans, setLoans] = useState<(Loan & { balance: number })[]>([]);

  useEffect(() => {
    const ls = getLoans();
    const txns = getAllLoanTransactions();
    setLoans(ls.map(l => ({ ...l, balance: calculateLoanBalance(txns.filter(t => t.loanId === l.id)) })));
  }, [key]);

  const filters = ["All", "Active", "Past Due", "Paid Off", "Written Off"];
  const filtered = loans
    .filter(l => filter === "All" || l.status === filter)
    .filter(l => !search || [l.borrowerName, l.borrowerPhone, l.borrowerEmail, l.relationship].some(f => f?.toLowerCase().includes(search.toLowerCase())));

  return (
    <div>
      <div className="page-header">
        <h2>Personal Loans</h2>
        <button className="btn btn-primary" onClick={() => navigate("/loans/new")}>+ Add Loan</button>
      </div>

      <div className="form-group" style={{ marginBottom: 16 }}>
        <input placeholder="Search loans..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="filter-row">
        {filters.map(f => <button key={f} className={`chip ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>{f}</button>)}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🤝</div>
          <h3>No Loans Found</h3>
          <p>{loans.length === 0 ? "Add your first personal loan to get started." : "No loans match your filter."}</p>
          {loans.length === 0 && <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate("/loans/new")}>+ Add Loan</button>}
        </div>
      ) : filtered.map(l => (
        <div key={l.id} className="list-item" onClick={() => navigate(`/loans/${l.id}`)}>
          <span className="item-icon">🤝</span>
          <div className="item-content">
            <div className="item-title">{l.borrowerName}</div>
            <div className="item-subtitle">{l.relationship || "Personal"} · Original: {fmtCurrency(l.originalAmount)}</div>
          </div>
          <div className="item-right">
            <div className="item-amount" style={{ color: l.balance > 0 ? "var(--warning)" : "var(--success)" }}>
              {l.balance > 0 ? `${fmtCurrency(l.balance)} owed` : "Paid off"}
            </div>
            <span className={`badge ${statusBadge(l.status)}`}>{l.status}</span>
          </div>
          <span className="item-arrow">›</span>
        </div>
      ))}
    </div>
  );
}
