import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getLoans,
  getAllLoanTransactions,
  calculateLoanBalance,
  loanDisplayTitle,
  loanBalanceOwedLabel,
  type Loan,
  type LoanDirection,
} from "../store";
import { fmtCurrency, statusBadge } from "../helpers";
import { useRefresh } from "../App";

type StatusFilter = "All" | "Active" | "Past Due" | "Paid Off" | "Written Off";
type LoanRow = Loan & { balance: number };

function LoanListSection({
  title,
  subtitle,
  emptyText,
  loans,
  addLabel,
  onAdd,
  onOpen,
}: {
  title: string;
  subtitle: string;
  emptyText: string;
  loans: LoanRow[];
  addLabel: string;
  onAdd: () => void;
  onOpen: (id: string) => void;
}) {
  return (
    <section style={{ marginBottom: 32 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <div>
          <h3 className="section-title" style={{ marginBottom: 4 }}>
            {title}
          </h3>
          <p style={{ color: "var(--muted)", margin: 0, fontSize: 15 }}>{subtitle}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={onAdd}>
          {addLabel}
        </button>
      </div>

      {loans.length === 0 ? (
        <div className="card" style={{ padding: 20 }}>
          <p style={{ margin: 0, color: "var(--muted)" }}>{emptyText}</p>
        </div>
      ) : (
        loans.map((l) => (
          <div key={l.id} className="list-item" onClick={() => onOpen(l.id)}>
            <span className="item-icon">🤝</span>
            <div className="item-content">
              <div className="item-title">{loanDisplayTitle(l)}</div>
              <div className="item-subtitle">
                {l.relationship || "Personal"} · Original: {fmtCurrency(l.originalAmount)}
              </div>
            </div>
            <div className="item-right">
              <div
                className="item-amount"
                style={{
                  color:
                    l.balance > 0
                      ? l.direction === "taken"
                        ? "var(--error)"
                        : "var(--warning)"
                      : "var(--success)",
                }}
              >
                {l.balance > 0
                  ? `${fmtCurrency(l.balance)} ${loanBalanceOwedLabel(l.direction)}`
                  : "Paid off"}
              </div>
              <span className={`badge ${statusBadge(l.status)}`}>{l.status}</span>
            </div>
            <span className="item-arrow">›</span>
          </div>
        ))
      )}
    </section>
  );
}

export default function Loans() {
  const navigate = useNavigate();
  const { key } = useRefresh();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [search, setSearch] = useState("");
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [ls, txns] = await Promise.all([getLoans(), getAllLoanTransactions()]);
        if (cancelled) return;
        setLoans(
          ls.map((l) => ({
            ...l,
            balance: calculateLoanBalance(txns.filter((t) => t.loanId === l.id)),
          }))
        );
      } catch (e) {
        if (!cancelled) alert((e as Error).message || "Could not load loans.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  const statusFilters: StatusFilter[] = ["All", "Active", "Past Due", "Paid Off", "Written Off"];

  const matchesSearchAndStatus = (l: LoanRow) => {
    if (statusFilter !== "All" && l.status !== statusFilter) return false;
    if (!search) return true;
    return [l.borrowerName, l.borrowerPhone, l.borrowerEmail, l.relationship].some((f) =>
      f?.toLowerCase().includes(search.toLowerCase())
    );
  };

  const iPay = loans.filter((l) => l.direction === "taken" && matchesSearchAndStatus(l));
  const theyPayMe = loans.filter((l) => l.direction === "given" && matchesSearchAndStatus(l));

  const goNew = (direction: LoanDirection) => {
    navigate(`/loans/new?direction=${direction}`);
  };

  if (loading) {
    return (
      <div className="empty-state" style={{ padding: 40 }}>
        <p>Loading loans…</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>Personal Loans</h2>
      </div>

      <p style={{ color: "var(--muted)", marginTop: -8, marginBottom: 16 }}>
        Two kinds of loans: ones <strong>you pay</strong>, and ones where <strong>someone pays you</strong>.
      </p>

      <div className="form-group" style={{ marginBottom: 16 }}>
        <input
          placeholder="Search loans..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="filter-row" style={{ marginBottom: 24 }}>
        {statusFilters.map((f) => (
          <button
            key={f}
            type="button"
            className={`chip ${statusFilter === f ? "active" : ""}`}
            onClick={() => setStatusFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <LoanListSection
        title="Loans I pay"
        subtitle="Money I borrowed — I make the payments"
        emptyText="No loans you pay yet. Add one if you borrowed money from a bank, person, or company."
        loans={iPay}
        addLabel="+ Add loan I pay"
        onAdd={() => goNew("taken")}
        onOpen={(id) => navigate(`/loans/${id}`)}
      />

      <LoanListSection
        title="Loans that pay me"
        subtitle="Money I lent — they make the payments"
        emptyText="No loans that pay you yet. Add one if you lent money to someone else."
        loans={theyPayMe}
        addLabel="+ Add loan that pays me"
        onAdd={() => goNew("given")}
        onOpen={(id) => navigate(`/loans/${id}`)}
      />
    </div>
  );
}
