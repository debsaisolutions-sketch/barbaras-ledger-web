import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProperty, getPropertyTransactions, getRunningBalanceTable, calculatePropertyBalance, getNotes, getDocuments, archiveProperty, type Property, type PropertyTransaction, type Note, type Document as Doc } from "../store";
import { fmtCurrency, fmtDate, statusBadge } from "../helpers";
import { useRefresh } from "../App";

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { key, refresh } = useRefresh();
  const [property, setProperty] = useState<Property | null>(null);
  const [txns, setTxns] = useState<(PropertyTransaction & { runningBalance: number })[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [tab, setTab] = useState<"balance" | "notes" | "docs">("balance");
  const balance = txns.length > 0 ? txns[txns.length - 1].runningBalance : 0;

  useEffect(() => {
    if (!id) return;
    const p = getProperty(id);
    if (p) { setProperty(p); setTxns(getRunningBalanceTable(getPropertyTransactions(id))); setNotes(getNotes("property", id)); setDocs(getDocuments("property", id)); }
  }, [id, key]);

  if (!property) return <div className="empty-state"><h3>Property not found</h3><button className="btn btn-primary" onClick={() => navigate("/properties")}>Back to Properties</button></div>;

  const handleArchive = () => {
    if (window.confirm(`Are you sure you want to close "${property.propertyName}"?`)) {
      archiveProperty(property.id); refresh(); navigate("/properties");
    }
  };

  return (
    <div>
      <button className="back-link" onClick={() => navigate("/properties")}>← Back to Properties</button>

      <div className="detail-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2>{property.propertyName}</h2>
            <div className="detail-subtitle">{property.address}</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className={`badge ${statusBadge(property.status)}`}>{property.status}</span>
          </div>
        </div>
        <div className="detail-info-grid">
          <div className="detail-info-item"><label>Tenant</label><p>{property.tenantName || "—"}</p></div>
          <div className="detail-info-item"><label>Phone</label><p>{property.tenantPhone || "—"}</p></div>
          <div className="detail-info-item"><label>Email</label><p>{property.tenantEmail || "—"}</p></div>
          <div className="detail-info-item"><label>Monthly Rent</label><p>{fmtCurrency(property.monthlyRent)}</p></div>
          <div className="detail-info-item"><label>Rent Due Day</label><p>{property.rentDueDay || "—"}</p></div>
          <div className="detail-info-item"><label>Lease Period</label><p>{fmtDate(property.leaseStartDate)} – {fmtDate(property.leaseEndDate)}</p></div>
          <div className="detail-info-item"><label>Security Deposit</label><p>{fmtCurrency(property.securityDeposit)}</p></div>
          <div className="detail-info-item"><label>Current Balance</label><p style={{ color: balance > 0 ? "var(--error)" : "var(--success)", fontSize: 22, fontWeight: 800 }}>{fmtCurrency(Math.max(0, balance))}</p></div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        <button className="btn btn-primary" onClick={() => navigate(`/properties/${id}/payment`)}>💰 Record Payment</button>
        <button className="btn btn-secondary" onClick={() => navigate(`/properties/${id}/late-fee`)}>⚠️ Add Late Fee</button>
        <button className="btn btn-secondary" onClick={() => navigate(`/properties/${id}/note`)}>📝 Add Note</button>
        <button className="btn btn-outline" onClick={() => navigate(`/properties/${id}/edit`)}>✏️ Edit</button>
        {property.status !== "Closed" && <button className="btn btn-danger btn-sm" onClick={handleArchive}>Close Property</button>}
      </div>

      {/* Tabs */}
      <div className="detail-tabs">
        <button className={`detail-tab ${tab === "balance" ? "active" : ""}`} onClick={() => setTab("balance")}>Running Balance ({txns.length})</button>
        <button className={`detail-tab ${tab === "notes" ? "active" : ""}`} onClick={() => setTab("notes")}>Notes ({notes.length})</button>
        <button className={`detail-tab ${tab === "docs" ? "active" : ""}`} onClick={() => setTab("docs")}>Documents ({docs.length})</button>
      </div>

      {tab === "balance" && (
        txns.length === 0 ? <div className="empty-state"><p>No transactions yet.</p></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Description</th><th>Charges</th><th>Payments</th><th>Balance</th></tr></thead>
              <tbody>
                {txns.map(t => (
                  <tr key={t.id}>
                    <td>{fmtDate(t.date)}</td>
                    <td>{t.description}{t.paymentMethod ? ` (${t.paymentMethod})` : ""}{t.checkNumber ? ` #${t.checkNumber}` : ""}</td>
                    <td style={{ color: t.chargeAmount > 0 ? "var(--error)" : "" }}>{t.chargeAmount > 0 ? fmtCurrency(t.chargeAmount) : ""}</td>
                    <td style={{ color: t.paymentAmount > 0 ? "var(--success)" : "" }}>{t.paymentAmount > 0 ? fmtCurrency(t.paymentAmount) : ""}</td>
                    <td style={{ fontWeight: 700 }}>{fmtCurrency(Math.max(0, t.runningBalance))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === "notes" && (
        notes.length === 0 ? <div className="empty-state"><p>No notes yet.</p></div> : notes.map(n => (
          <div key={n.id} className="card">
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>{fmtDate(n.noteDate)}{n.reminderDate ? ` · Reminder: ${fmtDate(n.reminderDate)}` : ""}</div>
            <div style={{ fontSize: 16, whiteSpace: "pre-wrap" }}>{n.noteText}</div>
          </div>
        ))
      )}

      {tab === "docs" && (
        docs.length === 0 ? <div className="empty-state"><p>No documents yet.</p></div> : docs.map(d => (
          <div key={d.id} className="card">
            <div style={{ fontWeight: 600 }}>{d.documentName}</div>
            <div style={{ fontSize: 14, color: "var(--muted)" }}>{d.documentType} · Uploaded {fmtDate(d.uploadedAt.split("T")[0])}</div>
          </div>
        ))
      )}
    </div>
  );
}
