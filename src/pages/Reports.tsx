import { useState } from "react";
import {
  generatePropertyTaxReport,
  generateLoanTaxReport,
  getDocuments,
  getAllNotes,
  getProperties,
  getLoans,
  getLedgerDisplayName,
  type PropertyTaxReport,
  type LoanTaxReport,
  type Document,
  type Note,
  type Property,
  type Loan,
} from "../store";
import { fmtCurrency, fmtDate } from "../helpers";

export default function Reports() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [reportType, setReportType] = useState<"property" | "loan" | "combined">("combined");
  const [propReports, setPropReports] = useState<PropertyTaxReport[]>([]);
  const [loanReports, setLoanReports] = useState<LoanTaxReport[]>([]);
  const [allDocs, setAllDocs] = useState<Document[]>([]);
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [allProps, setAllProps] = useState<Property[]>([]);
  const [allLoans, setAllLoans] = useState<Loan[]>([]);
  const [ledgerTitle, setLedgerTitle] = useState("EasyLedger");
  const [generated, setGenerated] = useState(false);
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    try {
      setBusy(true);
      const [prop, loan, docs, notes, properties, loans, customName] = await Promise.all([
        reportType === "property" || reportType === "combined"
          ? generatePropertyTaxReport(year)
          : Promise.resolve([] as PropertyTaxReport[]),
        reportType === "loan" || reportType === "combined"
          ? generateLoanTaxReport(year)
          : Promise.resolve([] as LoanTaxReport[]),
        getDocuments(),
        getAllNotes(),
        getProperties(),
        getLoans(),
        getLedgerDisplayName(),
      ]);
      setPropReports(prop);
      setLoanReports(loan);
      setAllDocs(docs);
      setAllNotes(notes);
      setAllProps(properties);
      setAllLoans(loans);
      setLedgerTitle(customName || "EasyLedger");
      setGenerated(true);
    } catch (e) {
      alert((e as Error).message || "Could not generate reports.");
    } finally {
      setBusy(false);
    }
  };

  const totalRentalIncome = propReports.reduce((s, r) => s + r.totalPayments, 0);
  const totalLoanPayments = loanReports.reduce((s, r) => s + r.totalPayments, 0);
  const outstandingBalances =
    propReports.reduce((s, r) => s + r.unpaidBalance, 0) +
    loanReports.reduce((s, r) => s + r.currentBalance, 0);

  const docsByType = {
    property: allDocs.filter((d) => d.relatedType === "property"),
    loan: allDocs.filter((d) => d.relatedType === "loan"),
    general: allDocs.filter((d) => d.relatedType === "general"),
  };

  const findPropertyName = (id: string) => allProps.find((p) => p.id === id)?.propertyName || "Property";
  const findLoanName = (id: string) => {
    const l = allLoans.find((x) => x.id === id);
    return l ? `Loan to ${l.borrowerName}` : "Loan";
  };

  return (
    <div>
      <div className="page-header">
        <h2>Year-End Tax Reports</h2>
        {generated && (
          <button className="btn btn-primary" onClick={() => window.print()}>
            🖨️ Print Tax Packet
          </button>
        )}
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="form-row">
          <div className="form-group">
            <label>Tax Year</label>
            <select value={year} onChange={e => { setYear(parseInt(e.target.value)); setGenerated(false); }}>
              {Array.from({ length: 5 }, (_, i) => currentYear - i).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Report Type</label>
            <select
              value={reportType}
              onChange={e => { setReportType(e.target.value as "property" | "loan" | "combined"); setGenerated(false); }}
            >
              <option value="combined">Full Combined Report</option>
              <option value="property">Rental Properties Only</option>
              <option value="loan">Personal Loans Only</option>
            </select>
          </div>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => void generate()} disabled={busy}>
          {busy ? "Loading…" : "Create Tax Packet"}
        </button>
      </div>

      {generated && (
        <>
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Tax Packet</h3>
            <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
              {ledgerTitle} · Tax year {year} · Printed {fmtDate(new Date().toISOString())}
            </p>
          </div>
          {/* Summary */}
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Summary — {year}</h3>
            <div className="card-row">
              {propReports.length > 0 && (
                <div className="card"><div className="stat-label">Total Rental Income</div><div className="stat-value green">{fmtCurrency(totalRentalIncome)}</div></div>
              )}
              {loanReports.length > 0 && (
                <div className="card"><div className="stat-label">Total Loan Payments Received</div><div className="stat-value green">{fmtCurrency(totalLoanPayments)}</div></div>
              )}
              <div className="card"><div className="stat-label">Outstanding Balances</div><div className="stat-value orange">{fmtCurrency(outstandingBalances)}</div></div>
              <div className="card"><div className="stat-label">Grand Total</div><div className="stat-value">{fmtCurrency(totalRentalIncome + totalLoanPayments)}</div></div>
            </div>
          </div>

          {/* Property Reports */}
          {propReports.length > 0 && (
            <>
              <h3 className="section-title">Rental Property Reports</h3>
              {propReports.map(r => (
                <div key={r.property.id} className="card" style={{ marginBottom: 16 }}>
                  <h4 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{r.property.propertyName}</h4>
                  <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 12 }}>{r.property.address} · Tenant: {r.property.tenantName || "—"}</div>
                  <div style={{ fontSize: 15, marginBottom: 12, lineHeight: 1.6 }}>
                    <strong>Status:</strong> {r.property.status}
                    {r.property.status === "Sold" && (
                      <>
                        {r.property.soldDate ? <> · <strong>Sold date:</strong> {fmtDate(r.property.soldDate)}</> : null}
                        {r.property.salePrice != null ? <> · <strong>Sale price:</strong> {fmtCurrency(r.property.salePrice)}</> : null}
                        {r.property.buyerName ? <> · <strong>Buyer:</strong> {r.property.buyerName}</> : null}
                        {r.property.saleNotes ? (
                          <div style={{ marginTop: 6 }}><strong>Sale notes:</strong> {r.property.saleNotes}</div>
                        ) : null}
                      </>
                    )}
                  </div>
                  <div className="card-row" style={{ marginBottom: 12 }}>
                    <div><span style={{ fontSize: 13, color: "var(--muted)" }}>Rent Received</span><div style={{ fontWeight: 700, color: "var(--success)" }}>{fmtCurrency(r.totalRentReceived)}</div></div>
                    <div><span style={{ fontSize: 13, color: "var(--muted)" }}>Late Fees</span><div style={{ fontWeight: 700 }}>{fmtCurrency(r.totalLateFees)}</div></div>
                    <div><span style={{ fontSize: 13, color: "var(--muted)" }}>Other</span><div style={{ fontWeight: 700 }}>{fmtCurrency(r.totalOtherCharges)}</div></div>
                    <div><span style={{ fontSize: 13, color: "var(--muted)" }}>Unpaid Balance</span><div style={{ fontWeight: 700, color: r.unpaidBalance > 0 ? "var(--error)" : "var(--success)" }}>{fmtCurrency(r.unpaidBalance)}</div></div>
                  </div>
                  {r.property.notes ? (
                    <div style={{ marginBottom: 12, fontSize: 15 }}>
                      <strong>Property notes:</strong> {r.property.notes}
                    </div>
                  ) : null}
                  {r.transactions.length > 0 && (
                    <div className="table-wrap">
                      <table>
                        <thead><tr><th>Date</th><th>Description</th><th>Charges</th><th>Payments</th></tr></thead>
                        <tbody>{r.transactions.map(t => (
                          <tr key={t.id}>
                            <td>{fmtDate(t.date)}</td><td>{t.description}</td>
                            <td>{t.chargeAmount > 0 ? fmtCurrency(t.chargeAmount) : ""}</td>
                            <td>{t.paymentAmount > 0 ? fmtCurrency(t.paymentAmount) : ""}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {/* Loan Reports */}
          {loanReports.length > 0 && (
            <>
              <h3 className="section-title">Personal Loan Reports</h3>
              {loanReports.map(r => (
                <div key={r.loan.id} className="card" style={{ marginBottom: 16 }}>
                  <h4 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Loan to {r.loan.borrowerName}</h4>
                  <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 12 }}>{r.loan.relationship || "Personal"} · Original: {fmtCurrency(r.originalAmount)}</div>
                  <div className="card-row" style={{ marginBottom: 12 }}>
                    <div><span style={{ fontSize: 13, color: "var(--muted)" }}>Payments Received</span><div style={{ fontWeight: 700, color: "var(--success)" }}>{fmtCurrency(r.totalPayments)}</div></div>
                    <div><span style={{ fontSize: 13, color: "var(--muted)" }}>Charges</span><div style={{ fontWeight: 700 }}>{fmtCurrency(r.totalCharges)}</div></div>
                    <div><span style={{ fontSize: 13, color: "var(--muted)" }}>Current Balance</span><div style={{ fontWeight: 700, color: r.currentBalance > 0 ? "var(--warning)" : "var(--success)" }}>{fmtCurrency(r.currentBalance)}</div></div>
                  </div>
                  {r.loan.notes ? (
                    <div style={{ marginBottom: 12, fontSize: 15 }}>
                      <strong>Loan notes:</strong> {r.loan.notes}
                    </div>
                  ) : null}
                  {r.transactions.length > 0 && (
                    <div className="table-wrap">
                      <table>
                        <thead><tr><th>Date</th><th>Description</th><th>Charges</th><th>Payments</th></tr></thead>
                        <tbody>{r.transactions.map(t => (
                          <tr key={t.id}>
                            <td>{fmtDate(t.date)}</td><td>{t.description}</td>
                            <td>{t.chargeAmount > 0 ? fmtCurrency(t.chargeAmount) : ""}</td>
                            <td>{t.paymentAmount > 0 ? fmtCurrency(t.paymentAmount) : ""}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          <h3 className="section-title">Document List</h3>
          <div className="card" style={{ marginBottom: 24 }}>
            <h4 style={{ marginBottom: 8 }}>By Property</h4>
            {docsByType.property.length === 0 ? (
              <p style={{ color: "var(--muted)", marginBottom: 12 }}>No property documents.</p>
            ) : (
              docsByType.property.map((d) => (
                <p key={d.id} style={{ marginBottom: 6 }}>
                  {findPropertyName(d.relatedId)} — {d.documentName} ({d.documentType}) · {fmtDate(d.uploadedAt.split("T")[0])}
                </p>
              ))
            )}
            <h4 style={{ margin: "14px 0 8px" }}>By Loan</h4>
            {docsByType.loan.length === 0 ? (
              <p style={{ color: "var(--muted)", marginBottom: 12 }}>No loan documents.</p>
            ) : (
              docsByType.loan.map((d) => (
                <p key={d.id} style={{ marginBottom: 6 }}>
                  {findLoanName(d.relatedId)} — {d.documentName} ({d.documentType}) · {fmtDate(d.uploadedAt.split("T")[0])}
                </p>
              ))
            )}
            <h4 style={{ margin: "14px 0 8px" }}>General</h4>
            {docsByType.general.length === 0 ? (
              <p style={{ color: "var(--muted)" }}>No general documents.</p>
            ) : (
              docsByType.general.map((d) => (
                <p key={d.id} style={{ marginBottom: 6 }}>
                  {d.documentName} ({d.documentType}) · {fmtDate(d.uploadedAt.split("T")[0])}
                </p>
              ))
            )}
          </div>

          <h3 className="section-title">Notes Summary</h3>
          <div className="card" style={{ marginBottom: 24 }}>
            {allNotes.length === 0 ? (
              <p style={{ color: "var(--muted)" }}>No notes available.</p>
            ) : (
              allNotes
                .sort((a, b) => b.noteDate.localeCompare(a.noteDate))
                .slice(0, 40)
                .map((n) => (
                  <p key={n.id} style={{ marginBottom: 8 }}>
                    {fmtDate(n.noteDate)} — {n.noteText}
                  </p>
                ))
            )}
          </div>

          {propReports.length === 0 && loanReports.length === 0 && (
            <div className="empty-state"><div className="empty-icon">📊</div><h3>No Data for {year}</h3><p>No transactions found for this year.</p></div>
          )}
        </>
      )}
    </div>
  );
}
