import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getLoan,
  getLoanTransactions,
  getLoanRunningBalanceTable,
  getNotes,
  getDocuments,
  archiveLoan,
  type Loan,
  type LoanTransaction,
  type Note,
  type Document as Doc,
} from "../store";
import { fmtCurrency, fmtDate, statusBadge } from "../helpers";
import { useRefresh } from "../App";
import { downloadDocumentFile, openDocumentInNewTab } from "../documentFiles";

export default function LoanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { key, refresh } = useRefresh();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [txns, setTxns] = useState<(LoanTransaction & { runningBalance: number })[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [tab, setTab] = useState<"balance" | "notes" | "docs">("balance");
  const [loading, setLoading] = useState(true);
  const balance = txns.length > 0 ? txns[txns.length - 1].runningBalance : 0;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const l = await getLoan(id);
        if (cancelled || !l) {
          if (!cancelled) setLoan(null);
          return;
        }
        const [rawTxns, n, d] = await Promise.all([
          getLoanTransactions(id),
          getNotes("loan", id),
          getDocuments("loan", id),
        ]);
        if (cancelled) return;
        setLoan(l);
        setTxns(getLoanRunningBalanceTable(rawTxns));
        setNotes(n);
        setDocs(d);
      } catch (e) {
        if (!cancelled) console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, key]);

  const handleArchive = async () => {
    if (!loan) return;
    if (window.confirm(`Write off loan to "${loan.borrowerName}"?`)) {
      try {
        await archiveLoan(loan.id);
        refresh();
        navigate("/loans");
      } catch (e) {
        alert((e as Error).message);
      }
    }
  };

  if (loading) {
    return (
      <div className="empty-state" style={{ padding: 40 }}>
        <p>Loading loan…</p>
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="empty-state">
        <h3>Loan not found</h3>
        <button className="btn btn-primary" onClick={() => navigate("/loans")}>
          Back to Loans
        </button>
      </div>
    );
  }

  return (
    <div>
      <button className="back-link" onClick={() => navigate("/loans")}>
        ← Back to Loans
      </button>
      <div className="detail-header">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h2>Loan to {loan.borrowerName}</h2>
            <div className="detail-subtitle">{loan.relationship || "Personal Loan"}</div>
          </div>
          <span className={`badge ${statusBadge(loan.status)}`}>{loan.status}</span>
        </div>
        <div className="detail-info-grid">
          <div className="detail-info-item">
            <label>Phone</label>
            <p>{loan.borrowerPhone || "—"}</p>
          </div>
          <div className="detail-info-item">
            <label>Email</label>
            <p>{loan.borrowerEmail || "—"}</p>
          </div>
          <div className="detail-info-item">
            <label>Original Amount</label>
            <p>{fmtCurrency(loan.originalAmount)}</p>
          </div>
          <div className="detail-info-item">
            <label>Loan Date</label>
            <p>{fmtDate(loan.loanDate)}</p>
          </div>
          <div className="detail-info-item">
            <label>Interest Rate</label>
            <p>{loan.interestRate}%</p>
          </div>
          <div className="detail-info-item">
            <label>Expected Monthly</label>
            <p>{fmtCurrency(loan.expectedMonthlyPayment)}</p>
          </div>
          <div className="detail-info-item">
            <label>Payment Due</label>
            <p>{fmtDate(loan.paymentDueDate)}</p>
          </div>
          <div className="detail-info-item">
            <label>Current Balance</label>
            <p
              style={{
                color: balance > 0 ? "var(--warning)" : "var(--success)",
                fontSize: 22,
                fontWeight: 800,
              }}
            >
              {fmtCurrency(Math.max(0, balance))}
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        <button className="btn btn-primary" onClick={() => navigate(`/loans/${id}/payment`)}>
          💰 Record Payment
        </button>
        <button className="btn btn-secondary" onClick={() => navigate(`/loans/${id}/charge`)}>
          📋 Add Charge
        </button>
        <button className="btn btn-secondary" onClick={() => navigate(`/loans/${id}/note`)}>
          📝 Add Note
        </button>
        <button className="btn btn-outline" onClick={() => navigate(`/loans/${id}/edit`)}>
          ✏️ Edit
        </button>
        {loan.status !== "Written Off" && loan.status !== "Paid Off" && (
          <button className="btn btn-danger btn-sm" onClick={handleArchive}>
            Write Off
          </button>
        )}
      </div>

      <div className="detail-tabs">
        <button
          className={`detail-tab ${tab === "balance" ? "active" : ""}`}
          onClick={() => setTab("balance")}
        >
          Running Balance ({txns.length})
        </button>
        <button
          className={`detail-tab ${tab === "notes" ? "active" : ""}`}
          onClick={() => setTab("notes")}
        >
          Notes ({notes.length})
        </button>
        <button className={`detail-tab ${tab === "docs" ? "active" : ""}`} onClick={() => setTab("docs")}>
          Documents ({docs.length})
        </button>
      </div>

      {tab === "balance" &&
        (txns.length === 0 ? (
          <div className="empty-state">
            <p>No transactions yet.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Charges</th>
                  <th>Payments</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {txns.map((t) => (
                  <tr key={t.id}>
                    <td>{fmtDate(t.date)}</td>
                    <td>
                      {t.description}
                      {t.paymentMethod ? ` (${t.paymentMethod})` : ""}
                      {t.checkNumber ? ` #${t.checkNumber}` : ""}
                      {t.referenceNumber ? ` · Ref: ${t.referenceNumber}` : ""}
                    </td>
                    <td style={{ color: t.chargeAmount > 0 ? "var(--error)" : "" }}>
                      {t.chargeAmount > 0 ? fmtCurrency(t.chargeAmount) : ""}
                    </td>
                    <td style={{ color: t.paymentAmount > 0 ? "var(--success)" : "" }}>
                      {t.paymentAmount > 0 ? fmtCurrency(t.paymentAmount) : ""}
                    </td>
                    <td style={{ fontWeight: 700 }}>{fmtCurrency(Math.max(0, t.runningBalance))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {tab === "notes" &&
        (notes.length === 0 ? (
          <div className="empty-state">
            <p>No notes yet.</p>
          </div>
        ) : (
          notes.map((n) => (
            <div key={n.id} className="card">
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>
                {fmtDate(n.noteDate)}
                {n.reminderDate ? ` · Reminder: ${fmtDate(n.reminderDate)}` : ""}
              </div>
              <div style={{ fontSize: 16, whiteSpace: "pre-wrap" }}>{n.noteText}</div>
            </div>
          ))
        ))}

      {tab === "docs" &&
        (docs.length === 0 ? (
          <div className="empty-state">
            <p>No documents yet.</p>
          </div>
        ) : (
          docs.map((d) => (
            <div key={d.id} className="card">
              <div style={{ fontWeight: 600 }}>{d.documentName}</div>
              <div style={{ fontSize: 14, color: "var(--muted)" }}>
                {d.documentType} · Uploaded {fmtDate(d.uploadedAt.split("T")[0])}
              </div>
              {d.storagePath ? (
                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={async () => {
                      const ok = await openDocumentInNewTab(d.storagePath!);
                      if (!ok) alert("Could not open this file.");
                    }}
                  >
                    View
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={async () => {
                      const ok = await downloadDocumentFile(
                        d.storagePath!,
                        d.originalFileName || d.documentName
                      );
                      if (!ok) alert("Could not download.");
                    }}
                  >
                    Download
                  </button>
                </div>
              ) : null}
            </div>
          ))
        ))}
    </div>
  );
}
