import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getProperty,
  getPropertyTransactions,
  getRunningBalanceTable,
  getPropertyScopedNotes,
  getDocuments,
  getPropertyExpenses,
  getReminders,
  addDocumentWithFile,
  getLedgerDisplayName,
  archiveProperty,
  markPropertySold,
  deleteProperty,
  deleteDocument,
  voidPropertyTransaction,
  deletePropertyTransaction,
  addNote,
  type Property,
  type PropertyTransaction,
  type PropertyExpense,
  type Note,
  type Document as Doc,
  type DocumentType,
  type Reminder,
} from "../store";
import { fmtCurrency, fmtDate, statusBadge } from "../helpers";
import { useRefresh } from "../App";
import { downloadDocumentFile, openDocumentInNewTab } from "../documentFiles";
import RentPeriodList from "../components/RentPeriodList";
import RepairsPanel from "../components/RepairsPanel";
import RemindersPanel from "../components/RemindersPanel";
import NotesList from "../components/NotesList";
import ConfirmDialog from "../components/ConfirmDialog";

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { key, refresh } = useRefresh();
  const [property, setProperty] = useState<Property | null>(null);
  const [txns, setTxns] = useState<(PropertyTransaction & { runningBalance: number })[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [expenses, setExpenses] = useState<PropertyExpense[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [askReminder, setAskReminder] = useState(false);
  const [tab, setTab] = useState<"balance" | "notes" | "docs">("balance");
  const [loading, setLoading] = useState(true);
  const [showSoldModal, setShowSoldModal] = useState(false);
  const [soldForm, setSoldForm] = useState({
    soldDate: new Date().toISOString().split("T")[0],
    salePrice: "",
    buyerName: "",
    saleNotes: "",
  });
  const [savingSold, setSavingSold] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingProperty, setDeletingProperty] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [savingUpload, setSavingUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({
    name: "",
    type: "Other" as DocumentType,
    notes: "",
  });
  const [ledgerTitle, setLedgerTitle] = useState("EasyLedger");
  const [txnAction, setTxnAction] = useState<null | { id: string; mode: "void" | "delete" }>(null);
  const [txnBusy, setTxnBusy] = useState(false);
  const [docToDelete, setDocToDelete] = useState<Doc | null>(null);
  const [docBusy, setDocBusy] = useState(false);
  const balance = txns.length > 0 ? txns[txns.length - 1].runningBalance : 0;
  const expenseTotal = expenses.reduce((s, e) => s + e.amount, 0);

  const canRecordPayments =
    property &&
    property.status !== "Closed" &&
    property.status !== "Sold";

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const p = await getProperty(id);
        if (cancelled || !p) {
          if (!cancelled) setProperty(null);
          return;
        }
        const [rawTxns, n, d, ex, rems] = await Promise.all([
          getPropertyTransactions(id),
          getPropertyScopedNotes(id),
          getDocuments("property", id),
          getPropertyExpenses(id),
          getReminders(),
        ]);
        if (cancelled) return;
        setProperty(p);
        setTxns(getRunningBalanceTable(rawTxns));
        setNotes(n);
        setDocs(d);
        setExpenses(ex);
        setReminders(rems);
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const custom = await getLedgerDisplayName();
        if (!cancelled && custom) setLedgerTitle(custom);
      } catch {
        /* keep default */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleMarkClosed = async () => {
    if (!property) return;
    if (
      window.confirm(
        `Mark "${property.propertyName}" as closed? You can still view history and reports.`
      )
    ) {
      try {
        await archiveProperty(property.id);
        refresh();
        alert("Saved. This property is now marked Closed.");
        navigate("/properties");
      } catch (e) {
        alert((e as Error).message);
      }
    }
  };

  const submitSold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property || !id) return;
    if (!soldForm.soldDate) {
      alert("Please enter the sold date.");
      return;
    }
    const price = parseFloat(soldForm.salePrice);
    if (soldForm.salePrice.trim() === "" || Number.isNaN(price) || price < 0) {
      alert("Please enter a valid sale price (0 or more).");
      return;
    }
    try {
      setSavingSold(true);
      await markPropertySold(id, {
        soldDate: soldForm.soldDate,
        salePrice: price,
        buyerName: soldForm.buyerName,
        saleNotes: soldForm.saleNotes,
      });
      refresh();
      setShowSoldModal(false);
      alert("Saved. This property is marked Sold. All payment history is kept.");
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSavingSold(false);
    }
  };

  const confirmDeleteProperty = async () => {
    if (!property) return;
    try {
      setDeletingProperty(true);
      await deleteProperty(property.id);
      refresh();
      setShowDeleteModal(false);
      alert("This property and its related records were removed.");
      navigate("/properties");
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setDeletingProperty(false);
    }
  };

  const confirmTxnAction = async () => {
    if (!txnAction) return;
    try {
      setTxnBusy(true);
      if (txnAction.mode === "void") await voidPropertyTransaction(txnAction.id, "Voided from property page");
      else await deletePropertyTransaction(txnAction.id);
      setTxnAction(null);
      refresh();
    } catch (err) {
      alert((err as Error).message || "Could not update this transaction.");
    } finally {
      setTxnBusy(false);
    }
  };

  const confirmDeleteDoc = async () => {
    if (!docToDelete) return;
    try {
      setDocBusy(true);
      await deleteDocument(docToDelete.id);
      setDocToDelete(null);
      refresh();
    } catch (err) {
      alert((err as Error).message || "Could not delete document.");
    } finally {
      setDocBusy(false);
    }
  };

  const saveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;
    if (!uploadForm.name.trim()) {
      alert("Please enter a document name.");
      return;
    }
    if (!uploadFile) {
      alert("Please choose a file to upload.");
      return;
    }
    try {
      setSavingUpload(true);
      await addDocumentWithFile(uploadFile, {
        documentName: uploadForm.name.trim(),
        documentType: uploadForm.type,
        relatedType: "property",
        relatedId: property.id,
        notes: uploadForm.notes.trim(),
      });
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadForm({ name: "", type: "Other", notes: "" });
      refresh();
      alert("Document saved.");
    } catch (err) {
      alert((err as Error).message || "Could not save document.");
    } finally {
      setSavingUpload(false);
    }
  };

  if (loading) {
    return (
      <div className="empty-state" style={{ padding: 40 }}>
        <p>Loading property…</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="empty-state">
        <h3>Property not found</h3>
        <button className="btn btn-primary" onClick={() => navigate("/properties")}>
          Back to Properties
        </button>
      </div>
    );
  }

  return (
    <div>
      <button className="back-link" onClick={() => navigate("/properties")}>
        ← Back to Properties
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
            <h2>{property.propertyName}</h2>
            <div className="detail-subtitle">{property.address}</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className={`badge ${statusBadge(property.status)}`}>{property.status}</span>
          </div>
        </div>
        {property.status === "Sold" && (
          <div
            className="card"
            style={{ marginTop: 16, background: "var(--card-bg, #fff)", border: "1px solid var(--border)" }}
          >
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Sale details</div>
            <div className="detail-info-grid">
              <div className="detail-info-item">
                <label>Sold date</label>
                <p>{property.soldDate ? fmtDate(property.soldDate) : "—"}</p>
              </div>
              <div className="detail-info-item">
                <label>Sale price</label>
                <p>{property.salePrice != null ? fmtCurrency(property.salePrice) : "—"}</p>
              </div>
              <div className="detail-info-item">
                <label>Buyer</label>
                <p>{property.buyerName || "—"}</p>
              </div>
              <div className="detail-info-item">
                <label>Sale notes</label>
                <p style={{ whiteSpace: "pre-wrap" }}>{property.saleNotes || "—"}</p>
              </div>
            </div>
          </div>
        )}
        <div className="detail-info-grid">
          <div className="detail-info-item">
            <label>Tenant</label>
            <p>{property.tenantName || "—"}</p>
          </div>
          <div className="detail-info-item">
            <label>Phone</label>
            <p>{property.tenantPhone || "—"}</p>
          </div>
          <div className="detail-info-item">
            <label>Email</label>
            <p>{property.tenantEmail || "—"}</p>
          </div>
          <div className="detail-info-item">
            <label>Expected rent</label>
            <p>
              {fmtCurrency(property.monthlyRent)}
              {property.rentFrequency === "weekly"
                ? " weekly"
                : property.rentFrequency === "biweekly"
                  ? " every two weeks"
                  : property.rentFrequency === "custom"
                    ? ` every ${property.rentIntervalDays || 30} days`
                    : " monthly"}
            </p>
          </div>
          <div className="detail-info-item">
            <label>{property.rentFrequency === "monthly" ? "Rent due day" : "Schedule starts"}</label>
            <p>
              {property.rentFrequency === "monthly"
                ? property.rentDueDay || "—"
                : property.rentAnchorDate
                  ? fmtDate(property.rentAnchorDate)
                  : "—"}
            </p>
          </div>
          <div className="detail-info-item">
            <label>Lease Period</label>
            <p>
              {fmtDate(property.leaseStartDate)} – {fmtDate(property.leaseEndDate)}
            </p>
          </div>
          <div className="detail-info-item">
            <label>Security Deposit</label>
            <p>{fmtCurrency(property.securityDeposit)}</p>
          </div>
          <div className="detail-info-item">
            <label>Current Balance</label>
            <p
              style={{
                color: balance > 0 ? "var(--error)" : "var(--success)",
                fontSize: 22,
                fontWeight: 800,
              }}
            >
              {fmtCurrency(Math.max(0, balance))}
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
        {canRecordPayments && (
          <>
            <button className="btn btn-primary btn-lg" onClick={() => navigate(`/properties/${id}/payment`)}>
              💰 Record Payment
            </button>
            <button
              className="btn btn-secondary btn-lg"
              onClick={() => navigate(`/properties/${id}/late-fee`)}
            >
              ⚠️ Add Late Fee
            </button>
          </>
        )}
        <button className="btn btn-secondary btn-lg" onClick={() => navigate(`/properties/${id}/note`)}>
          📝 Add Note
        </button>
        <button className="btn btn-secondary btn-lg" onClick={() => setAskReminder(true)}>
          ⏰ Add Reminder
        </button>
        <button className="btn btn-secondary btn-lg" onClick={() => setShowUploadModal(true)}>
          📄 Upload Document
        </button>
        <button className="btn btn-outline btn-lg" onClick={() => navigate(`/properties/${id}/edit`)}>
          ✏️ Edit
        </button>
        <button className="btn btn-outline btn-lg" onClick={() => window.print()}>
          🖨️ Print Property Summary
        </button>
        {property.status !== "Sold" && property.status !== "Closed" && (
          <button type="button" className="btn btn-primary btn-lg" onClick={() => setShowSoldModal(true)}>
            🏷️ Mark as Sold
          </button>
        )}
        {property.status !== "Closed" && (
          <button type="button" className="btn btn-secondary btn-lg" onClick={() => void handleMarkClosed()}>
            📁 Mark as Closed
          </button>
        )}
        <div style={{ width: "100%", maxWidth: 560 }}>
          <p style={{ fontSize: 14, color: "var(--muted)", margin: "0 0 8px 0", lineHeight: 1.5 }}>
            Use Delete only for mistakes, test records, or old properties you no longer need after taxes are
            complete. <strong>Mark as Sold</strong> and <strong>Mark as Closed</strong> are the recommended
            options for real records.
          </p>
          <button type="button" className="btn btn-danger btn-lg" onClick={() => setShowDeleteModal(true)}>
            🗑️ Delete Property
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 10 }}>Loan or mortgage</h3>
        {property.loanPaidOff ? (
          <p style={{ margin: 0 }}>Paid off, or no loan entered.</p>
        ) : (
          <div className="detail-info-grid">
            <div className="detail-info-item">
              <label>Lender</label>
              <p>{property.lender || "—"}</p>
            </div>
            <div className="detail-info-item">
              <label>Original amount</label>
              <p>{property.originalLoanAmount != null ? fmtCurrency(property.originalLoanAmount) : "—"}</p>
            </div>
            <div className="detail-info-item">
              <label>Remaining balance</label>
              <p>{property.remainingLoanBalance != null ? fmtCurrency(property.remainingLoanBalance) : "—"}</p>
            </div>
            <div className="detail-info-item">
              <label>Regular payment</label>
              <p>
                {property.loanPaymentAmount != null ? fmtCurrency(property.loanPaymentAmount) : "—"}
                {property.loanPaymentFrequency ? ` · ${property.loanPaymentFrequency}` : ""}
              </p>
            </div>
            <div className="detail-info-item">
              <label>Due</label>
              <p>{property.loanPaymentDue || "—"}</p>
            </div>
            <div className="detail-info-item">
              <label>Interest rate</label>
              <p>{property.loanInterestRate != null ? `${property.loanInterestRate}%` : "—"}</p>
            </div>
            {property.loanNotes ? (
              <div className="detail-info-item">
                <label>Loan notes</label>
                <p style={{ whiteSpace: "pre-wrap" }}>{property.loanNotes}</p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <RentPeriodList property={property} transactions={txns} />

      <RemindersPanel
        property={property}
        reminders={reminders}
        startOpen={askReminder}
        onStartOpenHandled={() => setAskReminder(false)}
        onChanged={refresh}
      />

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 10 }}>Property Documents</h3>
        {docs.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No documents linked to this property yet.</p>
        ) : (
          docs.map((d) => (
            <div key={d.id} className="list-item" style={{ cursor: "default", marginBottom: 8 }}>
              <div className="item-content">
                <div className="item-title">{d.documentName}</div>
                <div className="item-subtitle">
                  {d.documentType} · Uploaded {fmtDate(d.uploadedAt.split("T")[0])}
                </div>
              </div>
              {d.storagePath ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={async () => {
                      const ok = await openDocumentInNewTab(d.storagePath!);
                      if (!ok) alert("Could not open this file. Try again.");
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
                      if (!ok) alert("Could not download. Try again.");
                    }}
                  >
                    Download
                  </button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => setDocToDelete(d)}>
                    Delete
                  </button>
                </div>
              ) : (
                <button type="button" className="btn btn-danger btn-sm" onClick={() => setDocToDelete(d)}>
                  Delete
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {id && (
        <RepairsPanel propertyId={id} expenses={expenses} docs={docs} onChanged={refresh} />
      )}

      {showDeleteModal && (
        <div
          className="modal-overlay"
          onClick={() => !deletingProperty && setShowDeleteModal(false)}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: "none", overflow: "visible", maxWidth: 520 }}
          >
            <h3 style={{ fontSize: 24, marginBottom: 20 }}>Permanently Delete Property?</h3>
            <div style={{ fontSize: 18, lineHeight: 1.65, color: "var(--foreground)" }}>
              <p style={{ margin: "0 0 16px 0" }}>
                Deleting this property will remove the property, payment history, repairs &amp; expenses, notes,
                document records, and it will no longer appear in tax reports.
              </p>
              <p style={{ margin: "0 0 16px 0" }}>
                Only delete after taxes are done and you no longer need these property records.
              </p>
              <p style={{ margin: 0 }}>
                For real properties you may still need, use Mark as Sold or Mark as Closed instead.
              </p>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
                marginTop: 28,
                alignItems: "stretch",
              }}
            >
              <button
                type="button"
                className="btn btn-primary btn-lg"
                style={{ width: "100%" }}
                onClick={() => setShowDeleteModal(false)}
                disabled={deletingProperty}
              >
                Cancel — Keep Records
              </button>
              <button
                type="button"
                className="btn btn-danger btn-lg"
                style={{ width: "100%" }}
                onClick={() => void confirmDeleteProperty()}
                disabled={deletingProperty}
              >
                {deletingProperty ? "Deleting…" : "Yes, Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSoldModal && (
        <div className="modal-overlay" onClick={() => !savingSold && setShowSoldModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Mark as Sold</h3>
            <p style={{ color: "var(--muted)", marginBottom: 16 }}>
              This keeps all rent payments and history. It only updates the sale information.
            </p>
            <form onSubmit={(e) => void submitSold(e)}>
              <div className="form-group">
                <label>Sold date *</label>
                <input
                  type="date"
                  value={soldForm.soldDate}
                  onChange={(e) => setSoldForm((f) => ({ ...f, soldDate: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Sale price ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={soldForm.salePrice}
                  onChange={(e) => setSoldForm((f) => ({ ...f, salePrice: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="form-group">
                <label>Buyer name (optional)</label>
                <input
                  value={soldForm.buyerName}
                  onChange={(e) => setSoldForm((f) => ({ ...f, buyerName: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Notes (optional)</label>
                <textarea
                  value={soldForm.saleNotes}
                  onChange={(e) => setSoldForm((f) => ({ ...f, saleNotes: e.target.value }))}
                  style={{ minHeight: 80 }}
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline btn-lg"
                  onClick={() => setShowSoldModal(false)}
                  disabled={savingSold}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-lg" disabled={savingSold}>
                  {savingSold ? "Saving…" : "Save — Mark as Sold"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {txnAction && (
        <ConfirmDialog
          title={txnAction.mode === "void" ? "Void this transaction?" : "Delete this transaction?"}
          confirmLabel={txnAction.mode === "void" ? "Void — keep the record" : "Delete permanently"}
          danger={txnAction.mode === "delete"}
          busy={txnBusy}
          onCancel={() => setTxnAction(null)}
          onConfirm={() => void confirmTxnAction()}
        >
          {txnAction.mode === "void" ? (
            <p style={{ margin: 0 }}>
              Void keeps the payment or charge in your history, but it will not count toward rent or the balance.
              Use this for a mistake you still want to see.
            </p>
          ) : (
            <p style={{ margin: 0 }}>
              Permanent delete is for test entries or mistakes you do not need to keep. This cannot be undone.
            </p>
          )}
        </ConfirmDialog>
      )}

      {docToDelete && (
        <ConfirmDialog
          title="Delete this document?"
          confirmLabel="Delete document"
          danger
          busy={docBusy}
          onCancel={() => setDocToDelete(null)}
          onConfirm={() => void confirmDeleteDoc()}
        >
          <p style={{ margin: 0 }}>This removes {docToDelete.documentName} from your records.</p>
        </ConfirmDialog>
      )}

      {showUploadModal && (
        <div className="modal-overlay" onClick={() => !savingUpload && setShowUploadModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Upload Document</h3>
            <form onSubmit={(e) => void saveDocument(e)}>
              <div className="form-group">
                <label>Document Name *</label>
                <input
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Document Type</label>
                <select
                  value={uploadForm.type}
                  onChange={(e) => setUploadForm((f) => ({ ...f, type: e.target.value as DocumentType }))}
                >
                  <option>Rental Agreement</option>
                  <option>Lease</option>
                  <option>Receipt</option>
                  <option>Check Image</option>
                  <option>Payment Proof</option>
                  <option>Tax Document</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={uploadForm.notes}
                  onChange={(e) => setUploadForm((f) => ({ ...f, notes: e.target.value }))}
                  style={{ minHeight: 90 }}
                />
              </div>
              <div className="form-group">
                <label>File upload *</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.heic,.heif,.webp,image/*,application/pdf"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline btn-lg"
                  onClick={() => setShowUploadModal(false)}
                  disabled={savingUpload}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-lg" disabled={savingUpload}>
                  {savingUpload ? "Saving…" : "Save Document"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Property Summary (Print)</h3>
        <p style={{ color: "var(--muted)", marginBottom: 8 }}>{ledgerTitle}</p>
        <p style={{ color: "var(--muted)", marginBottom: 14 }}>Printed: {fmtDate(new Date().toISOString())}</p>
        <div className="detail-info-grid">
          <div className="detail-info-item"><label>Property</label><p>{property.propertyName}</p></div>
          <div className="detail-info-item"><label>Address</label><p>{property.address || "—"}</p></div>
          <div className="detail-info-item"><label>Tenant</label><p>{property.tenantName || "—"}</p></div>
          <div className="detail-info-item"><label>Contact</label><p>{property.tenantContact || property.tenantPhone || "—"}</p></div>
          <div className="detail-info-item"><label>Rent</label><p>{fmtCurrency(property.monthlyRent)}</p></div>
          <div className="detail-info-item"><label>Due day</label><p>{property.rentDueDay || "—"}</p></div>
          <div className="detail-info-item"><label>Status</label><p>{property.status}</p></div>
          <div className="detail-info-item"><label>Current balance</label><p>{fmtCurrency(Math.max(0, balance))}</p></div>
          <div className="detail-info-item">
            <label>Total repairs &amp; expenses</label>
            <p style={{ fontWeight: 700 }}>{fmtCurrency(expenseTotal)}</p>
          </div>
        </div>
        {property.status === "Sold" && (
          <div style={{ marginTop: 10, fontSize: 15, lineHeight: 1.7 }}>
            <strong>Sold:</strong> {property.soldDate ? fmtDate(property.soldDate) : "—"} ·{" "}
            <strong>Price:</strong> {property.salePrice != null ? fmtCurrency(property.salePrice) : "—"} ·{" "}
            <strong>Buyer:</strong> {property.buyerName || "—"}
            <div><strong>Sale notes:</strong> {property.saleNotes || "—"}</div>
          </div>
        )}
        <h4 style={{ marginTop: 16, marginBottom: 8 }}>Repairs &amp; Expenses (itemized)</h4>
        {expenses.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No expenses recorded.</p>
        ) : (
          <div className="table-wrap" style={{ marginBottom: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Vendor</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((ex) => (
                  <tr key={`print-ex-${ex.id}`}>
                    <td>{fmtDate(ex.expenseDate)}</td>
                    <td>{ex.category}</td>
                    <td>{ex.description || "—"}</td>
                    <td>{ex.vendorName || "—"}</td>
                    <td>{fmtCurrency(ex.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ marginTop: 8, fontWeight: 700 }}>Total: {fmtCurrency(expenseTotal)}</p>
          </div>
        )}
        <h4 style={{ marginTop: 16, marginBottom: 8 }}>Payment / Charge History</h4>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Description</th><th>Charges</th><th>Payments</th><th>Balance</th></tr></thead>
            <tbody>
              {txns.map((t) => (
                <tr key={`print-${t.id}`}>
                  <td>{fmtDate(t.date)}</td>
                  <td>{t.description}</td>
                  <td>{t.chargeAmount > 0 ? fmtCurrency(t.chargeAmount) : ""}</td>
                  <td>{t.paymentAmount > 0 ? fmtCurrency(t.paymentAmount) : ""}</td>
                  <td>{fmtCurrency(Math.max(0, t.runningBalance))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h4 style={{ marginTop: 16, marginBottom: 8 }}>Notes</h4>
        {notes.length === 0 ? <p style={{ color: "var(--muted)" }}>No notes.</p> : notes.map((n) => (
          <p key={`print-note-${n.id}`} style={{ marginBottom: 6 }}>
            {fmtDate(n.noteDate)} — {n.noteText}
          </p>
        ))}
        <h4 style={{ marginTop: 16, marginBottom: 8 }}>Documents</h4>
        {docs.length === 0 ? <p style={{ color: "var(--muted)" }}>No documents.</p> : docs.map((d) => (
          <p key={`print-doc-${d.id}`} style={{ marginBottom: 6 }}>
            {d.documentName} ({d.documentType}) — {fmtDate(d.uploadedAt.split("T")[0])}
          </p>
        ))}
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
                  <tr key={t.id} style={t.voidedAt ? { opacity: 0.55 } : undefined}>
                    <td>{fmtDate(t.date)}</td>
                    <td>
                      {t.voidedAt ? "Voided · " : ""}
                      {t.description}
                      {t.paymentMethod ? ` (${t.paymentMethod})` : ""}
                      {t.checkNumber ? ` #${t.checkNumber}` : ""}
                      {t.referenceNumber ? ` · Ref: ${t.referenceNumber}` : ""}
                      {t.rentPeriodStart ? ` · Period ${fmtDate(t.rentPeriodStart)}` : ""}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                        {!t.voidedAt && (
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => setTxnAction({ id: t.id, mode: "void" })}>
                            Void
                          </button>
                        )}
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => setTxnAction({ id: t.id, mode: "delete" })}>
                          Delete
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => {
                            const text = window.prompt("Note about this payment or charge");
                            if (!text?.trim() || !property) return;
                            void addNote({
                              relatedType: t.type === "payment" ? "payment" : "property",
                              relatedId: t.type === "payment" ? t.id : property.id,
                              propertyId: property.id,
                              noteDate: new Date().toISOString().split("T")[0],
                              noteText: text.trim(),
                              reminderDate: "",
                            })
                              .then(refresh)
                              .catch((error) => alert((error as Error).message || "Could not save note."));
                          }}
                        >
                          Add note
                        </button>
                      </div>
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

      {tab === "notes" && <NotesList notes={notes} onChanged={refresh} />}

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
                      if (!ok) alert("Could not open this file. Try again.");
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
                      if (!ok) alert("Could not download. Try again.");
                    }}
                  >
                    Download
                  </button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => setDocToDelete(d)}>
                    Delete
                  </button>
                </div>
              ) : (
                <button type="button" className="btn btn-danger btn-sm" onClick={() => setDocToDelete(d)}>
                  Delete
                </button>
              )}
            </div>
          ))
        ))}
    </div>
  );
}
