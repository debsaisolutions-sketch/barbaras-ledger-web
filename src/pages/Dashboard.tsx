import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getDashboardStats,
  getActivities,
  getProperties,
  getLoans,
  getUpcomingReminders,
  markPropertyReminderDone,
  markLoanReminderDone,
  type ActivityItem,
  type ReminderListItem,
} from "../store";
import { fmtCurrency, fmtDate, getDailyVerse } from "../helpers";
import { useRefresh } from "../App";

export default function Dashboard() {
  const navigate = useNavigate();
  const { key } = useRefresh();
  const verse = getDailyVerse();
  const [stats, setStats] = useState({
    totalRentalIncome: 0,
    totalLoanPayments: 0,
    totalLateFees: 0,
    unpaidRent: 0,
    openLoanBalances: 0,
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [propCount, setPropCount] = useState(0);
  const [loanCount, setLoanCount] = useState(0);
  const [reminders, setReminders] = useState<ReminderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingReminderKey, setMarkingReminderKey] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [s, act, props, loans, rem] = await Promise.all([
          getDashboardStats(),
          getActivities(15),
          getProperties(),
          getLoans(),
          getUpcomingReminders(),
        ]);
        if (cancelled) return;
        setStats(s);
        setActivities(act);
        setReminders(rem);
        setPropCount(
          props.filter((p) => p.status !== "Closed" && p.status !== "Sold").length
        );
        setLoanCount(loans.filter((l) => l.status !== "Written Off" && l.status !== "Paid Off").length);
      } catch (e) {
        console.error(e);
        if (!cancelled) alert((e as Error).message || "Could not load dashboard.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  const actIcon = (t: string) => {
    switch (t) {
      case "payment":
        return "💰";
      case "late_fee":
        return "⚠️";
      case "charge":
        return "📋";
      case "note":
        return "📝";
      case "document":
        return "📄";
      default:
        return "📌";
    }
  };

  const handleMarkDone = async (r: ReminderListItem) => {
    const keyForRow = `${r.entityType}:${r.entityId}`;
    try {
      setMarkingReminderKey(keyForRow);
      if (r.entityType === "property") await markPropertyReminderDone(r.entityId);
      else await markLoanReminderDone(r.entityId);
      setReminders((prev) => prev.filter((x) => !(x.entityType === r.entityType && x.entityId === r.entityId)));
    } catch (e) {
      alert((e as Error).message || "Could not mark reminder done.");
    } finally {
      setMarkingReminderKey("");
    }
  };

  if (loading) {
    return (
      <div className="empty-state" style={{ padding: 40 }}>
        <p>Loading your dashboard…</p>
      </div>
    );
  }

  return (
    <div>
      <div className="verse-card">
        <div className="verse-text">&quot;{verse.verse}&quot;</div>
        <div className="verse-ref">— {verse.ref}</div>
      </div>

      <div className="page-header">
        <h2>Dashboard</h2>
      </div>

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

      <h3 className="section-title">Upcoming Reminders</h3>
      <div className="card" style={{ marginBottom: 24 }}>
        {reminders.length === 0 ? (
          <div className="empty-state" style={{ padding: 20 }}>
            <p style={{ margin: 0, color: "var(--muted)" }}>
              No upcoming reminders. Add a date and note on a property or loan to see it here.
            </p>
          </div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {reminders.map((r, i) => (
              <li
                key={`${r.entityType}-${r.entityId}-${r.date}-${i}`}
                style={{
                  padding: "12px 0",
                  borderBottom: i < reminders.length - 1 ? "1px solid var(--border)" : undefined,
                }}
              >
                <div style={{ fontWeight: 600 }}>{fmtDate(r.date)}</div>
                <div style={{ marginTop: 4 }}>{r.entityLabel}</div>
                {r.note ? (
                  <div style={{ color: "var(--muted)", marginTop: 4 }}>{r.note}</div>
                ) : (
                  <div style={{ color: "var(--muted)", marginTop: 4 }}>—</div>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() =>
                      navigate(r.entityType === "property" ? `/properties/${r.entityId}` : `/loans/${r.entityId}`)
                    }
                  >
                    Open {r.entityType === "property" ? "property" : "loan"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => void handleMarkDone(r)}
                    disabled={markingReminderKey === `${r.entityType}:${r.entityId}`}
                  >
                    {markingReminderKey === `${r.entityType}:${r.entityId}` ? "Saving..." : "Mark Done"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <h3 className="section-title">Quick Actions</h3>
      <div className="actions-grid">
        <button className="action-btn" onClick={() => navigate("/properties/new")}>
          <span className="action-icon">🏢</span>Add Property
        </button>
        <button className="action-btn" onClick={() => navigate("/loans/new")}>
          <span className="action-icon">🤝</span>Add Loan
        </button>
        <button className="action-btn" onClick={() => navigate("/add-payment")}>
          <span className="action-icon">💰</span>Record Payment
        </button>
        <button className="action-btn" onClick={() => navigate("/add-loan-payment")}>
          <span className="action-icon">💵</span>Loan Payment
        </button>
        <button className="action-btn" onClick={() => navigate("/add-note")}>
          <span className="action-icon">📝</span>Add Note
        </button>
        <button className="action-btn" onClick={() => navigate("/reports")}>
          <span className="action-icon">📊</span>Tax Reports
        </button>
      </div>

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

      <h3 className="section-title">Recent Activity</h3>
      <div className="card">
        {activities.length === 0 ? (
          <div className="empty-state" style={{ padding: 30 }}>
            <p>No activity yet. Start by adding a property or loan.</p>
          </div>
        ) : (
          activities.map((a) => (
            <div key={a.id} className="activity-item">
              <span className="activity-icon">{actIcon(a.type)}</span>
              <div className="activity-content">
                <div className="activity-title">{a.entityName}</div>
                <div className="activity-desc">{a.description}</div>
                <div className="activity-date">
                  {fmtDate(a.date)}
                  {a.personName ? ` · ${a.personName}` : ""}
                </div>
              </div>
              {a.amount > 0 && <div className="activity-amount">{fmtCurrency(a.amount)}</div>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
