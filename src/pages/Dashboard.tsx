import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardStats, getActivities, getProperties, getLoans, type ActivityItem } from "../store";
import { fmtCurrency, fmtDate, getDailyVerse } from "../helpers";
import { useRefresh } from "../App";

export default function Dashboard() {
  const navigate = useNavigate();
  const { key } = useRefresh();
  const verse = getDailyVerse();
  const [stats, setStats] = useState({ totalRentalIncome: 0, totalLoanPayments: 0, totalLateFees: 0, unpaidRent: 0, openLoanBalances: 0 });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [propCount, setPropCount] = useState(0);
  const [loanCount, setLoanCount] = useState(0);

  useEffect(() => {
    setStats(getDashboardStats());
    setActivities(getActivities(15));
    setPropCount(getProperties().filter(p => p.status !== "Closed").length);
    setLoanCount(getLoans().filter(l => l.status !== "Written Off" && l.status !== "Paid Off").length);
  }, [key]);

  const actIcon = (t: string) => {
    switch (t) { case "payment": return "💰"; case "late_fee": return "⚠️"; case "charge": return "📋"; case "note": return "📝"; case "document": return "📄"; default: return "📌"; }
  };

  return (
    <div>
      {/* Bible Verse */}
      <div className="verse-card">
        <div className="verse-text">"{verse.verse}"</div>
        <div className="verse-ref">— {verse.ref}</div>
      </div>

      <div className="page-header"><h2>Dashboard</h2></div>

      {/* Stats */}
      <div className="card-row" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="stat-label">Rental Income (YTD)</div>
          <div className="stat-value green">{fmtCurrency(stats.totalRentalIncome)}</div>
        </div>
        <div className="card">
          <div className="stat-label">Loan Payments (YTD)</div>
          <div className="stat-value green">{fmtCurrency(stats.totalLoanPayments)}</div>
        </div>
        <div className="card">
          <div className="stat-label">Unpaid Rent</div>
          <div className="stat-value red">{fmtCurrency(stats.unpaidRent)}</div>
        </div>
        <div className="card">
          <div className="stat-label">Open Loan Balances</div>
          <div className="stat-value orange">{fmtCurrency(stats.openLoanBalances)}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <h3 className="section-title">Quick Actions</h3>
      <div className="actions-grid">
        <button className="action-btn" onClick={() => navigate("/properties/new")}><span className="action-icon">🏢</span>Add Property</button>
        <button className="action-btn" onClick={() => navigate("/loans/new")}><span className="action-icon">🤝</span>Add Loan</button>
        <button className="action-btn" onClick={() => navigate("/add-payment")}><span className="action-icon">💰</span>Record Payment</button>
        <button className="action-btn" onClick={() => navigate("/add-loan-payment")}><span className="action-icon">💵</span>Loan Payment</button>
        <button className="action-btn" onClick={() => navigate("/add-note")}><span className="action-icon">📝</span>Add Note</button>
        <button className="action-btn" onClick={() => navigate("/reports")}><span className="action-icon">📊</span>Tax Reports</button>
      </div>

      {/* Summary */}
      <div className="card-row" style={{ marginBottom: 24 }}>
        <div className="card" style={{ cursor: "pointer" }} onClick={() => navigate("/properties")}>
          <div className="stat-label">Active Properties</div>
          <div className="stat-value">{propCount}</div>
        </div>
        <div className="card" style={{ cursor: "pointer" }} onClick={() => navigate("/loans")}>
          <div className="stat-label">Active Loans</div>
          <div className="stat-value">{loanCount}</div>
        </div>
        <div className="card">
          <div className="stat-label">Late Fees (YTD)</div>
          <div className="stat-value orange">{fmtCurrency(stats.totalLateFees)}</div>
        </div>
      </div>

      {/* Recent Activity */}
      <h3 className="section-title">Recent Activity</h3>
      <div className="card">
        {activities.length === 0 ? (
          <div className="empty-state" style={{ padding: 30 }}>
            <p>No activity yet. Start by adding a property or loan.</p>
          </div>
        ) : activities.map(a => (
          <div key={a.id} className="activity-item">
            <span className="activity-icon">{actIcon(a.type)}</span>
            <div className="activity-content">
              <div className="activity-title">{a.entityName}</div>
              <div className="activity-desc">{a.description}</div>
              <div className="activity-date">{fmtDate(a.date)}{a.personName ? ` · ${a.personName}` : ""}</div>
            </div>
            {a.amount > 0 && <div className="activity-amount">{fmtCurrency(a.amount)}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
