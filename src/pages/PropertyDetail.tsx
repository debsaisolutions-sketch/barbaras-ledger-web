import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getProperty,
  getPropertyTransactions,
  getRunningBalanceTable,
  getNotes,
  getDocuments,
  getPropertyExpenses,
  addPropertyExpense,
  addDocumentWithFile,
  getLedgerDisplayName,
  updateProperty,
  archiveProperty,
  markPropertyReminderDone,
  markPropertySold,
  deleteProperty,
  PAYMENT_METHOD_OPTIONS,
  PROPERTY_EXPENSE_CATEGORIES,
  type Property,
  type PropertyTransaction,
  type PropertyExpense,
  type Note,
  type Document as Doc,
  type DocumentType,
} from "../store";
import { fmtCurrency, fmtDate, statusBadge } from "../helpers";
import { useRefresh } from "../App";
import { downloadDocumentFile, openDocumentInNewTab } from "../documentFiles";

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { key, refresh } = useRefresh();
  const [property, setProperty] = useState<Property | null>(null);
  const [txns, setTxns] = useState<(PropertyTransaction & { runningBalance: number })[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [expenses, setExpenses] = useState<PropertyExpense[]>([]);
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
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [savingReminder, setSavingReminder] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [savingUpload, setSavingUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({
    name: "",
    type: "Other" as DocumentType,
    notes: "",
  });
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [expenseReceiptFile, setExpenseReceiptFile] = useState<File | null>(null);
  const [expenseForm, setExpenseForm] = useState({
    expenseDate: new Date().toISOString().split("T")[0],
    category: "Other" as string,
    description: "",
    vendorName: "",
    amount: "",
    paymentMethod: "",
    referenceNumber: "",
    notes: "",
  });
  const [ledgerTitle, setLedgerTitle] = useState("EasyLedger");
  const [reminderForm, setReminderForm] = useState({
    reminderDate: "",
    reminderNote: "",
  });
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
        const [rawTxns, n, d, ex] = await Promise.all([
          getPropertyTransactions(id),
          getNotes("property", id),
          getDocuments("property", id),
          getPropertyExpenses(id),
        ]);
        if (cancelled) return;
        setProperty(p);
        setTxns(getRunningBalanceTable(rawTxns));
        setNotes(n);
        setDocs(d);
        setExpenses(ex);
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

  const openReminderModal = () => {
    if (!property) return;
    setReminderForm({
      reminderDate: property.nextReminderDate || "",
      reminderNote: property.reminderNote || "",
    });
    setShowReminderModal(true);
  };

  const saveReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;
    const reminderDate = reminderForm.reminderDate.trim();
    const reminderNote = reminderForm.reminderNote.trim();
    if (!reminderDate) {
      if (reminderNote) {
        alert("Please choose a reminder date so this can appear on your Dashboard.");
      } else {
        alert("Please choose a reminder date.");
      }
      return;
    }
    try {
      setSavingReminder(true);
      await updateProperty(property.id, {
        nextReminderDate: reminderDate,
        reminderNote,
        reminderCompleted: false,
        reminderCompletedAt: "",
      });
      setShowReminderModal(false);
      refresh();
      alert("Reminder saved.");
    } catch (err) {
      alert((err as Error).message || "Could not save reminder.");
    } finally {
      setSavingReminder(false);
    }
  };

  const markReminderDone = async () => {
    if (!property) return;
    try {
      await markPropertyReminderDone(property.id);
      refresh();
      alert("Reminder marked done.");
    } catch (err) {
      alert((err as Error).message || "Could not update reminder.");
    }
  };

  const openExpenseModal = () => {
    setExpenseForm({
      expenseDate: new Date().toISOString().split("T")[0],
      category: "Other",
      description: "",
      vendorName: "",
      amount: "",
      paymentMethod: "",
      referenceNumber: "",
      notes: "",
    });
    setExpenseReceiptFile(null);
    setShowExpenseModal(true);
  };

  const saveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property || !id) return;
    const amt = parseFloat(expenseForm.amount);
    if (expenseForm.amount.trim() === "" || Number.isNaN(amt) || amt < 0) {
      alert("Please enter a valid amount (0 or more).");
      return;
    }
    try {
      setSavingExpense(true);
      await addPropertyExpense(
        property.id,
        {
          expenseDate: expenseForm.expenseDate,
          category: expenseForm.category,
          description: expenseForm.description,
          vendorName: expenseForm.vendorName,
          amount: amt,
          paymentMethod: expenseForm.paymentMethod,
          referenceNumber: expenseForm.referenceNumber,
          notes: expenseForm.notes,
        },
        expenseReceiptFile
      );
      setShowExpenseModal(false);
      setExpenseReceiptFile(null);
      refresh();
      alert("Expense saved.");
    } catch (err) {
      alert((err as Error).message || "Could not save expense.");
    } finally {
      setSavingExpense(false);
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
            <label>Monthly Rent</label>
            <p>{fmtCurrency(property.monthlyRent)}</p>
          </div>
          <div className="detail-info-item">
            <label>Rent Due Day</label>
            <p>{property.rentDueDay || "—"}</p>
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
        <button className="btn btn-secondary btn-lg" onClick={openReminderModal}>
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

      {(property.nextReminderDate || property.reminderNote || property.reminderCompleted) && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 10 }}>Current Reminder</h3>
          <div className="detail-info-grid">
            <div className="detail-info-item">
              <label>Reminder date</label>
              <p>{property.nextReminderDate ? fmtDate(property.nextReminderDate) : "—"}</p>
            </div>
            <div className="detail-info-item">
              <label>Reminder note</label>
              <p style={{ whiteSpace: "pre-wrap" }}>{property.reminderNote || "—"}</p>
            </div>
            <div className="detail-info-item">
              <label>Status</label>
              <p>{property.reminderCompleted ? "Done" : "Open"}</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <button className="btn btn-outline btn-sm" onClick={openReminderModal}>
              Edit Reminder
            </button>
            {!property.reminderCompleted && property.nextReminderDate && (
              <button className="btn btn-primary btn-sm" onClick={() => void markReminderDone()}>
                Mark Done
              </button>
            )}
          </div>
        </div>
      )}

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
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <h3 style={{ margin: 0 }}>Repairs &amp; Expenses</h3>
          <button type="button" className="btn btn-primary btn-lg" onClick={openExpenseModal}>
            Add Expense / Receipt
          </button>
        </div>
        <p style={{ color: "var(--muted)", marginBottom: 12, lineHeight: 1.5 }}>
          Track maintenance, repairs, and receipts for your records (for example, at tax time).
        </p>
        {expenses.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No expenses recorded yet. Use Add Expense / Receipt to add one.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Vendor</th>
                  <th>Amount</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((ex) => {
                  const receiptDoc = ex.documentId ? docs.find((d) => d.id === ex.documentId) : undefined;
                  return (
                    <tr key={ex.id}>
                      <td>{fmtDate(ex.expenseDate)}</td>
                      <td>{ex.category}</td>
                      <td>{ex.description || "—"}</td>
                      <td>{ex.vendorName || "—"}</td>
                      <td>{fmtCurrency(ex.amount)}</td>
                      <td>
                        {receiptDoc?.storagePath ? (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={async () => {
                              const ok = await openDocumentInNewTab(receiptDoc.storagePath!);
                              if (!ok) alert("Could not open receipt. Try again.");
                            }}
                          >
                            View receipt
                          </button>
                        ) : ex.documentId ? (
                          <span style={{ color: "var(--muted)" }}>File…</span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

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

      {showReminderModal && (
        <div className="modal-overlay" onClick={() => !savingReminder && setShowReminderModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add Reminder</h3>
            <p style={{ color: "var(--muted)", marginBottom: 14, lineHeight: 1.5 }}>
              Use reminders for things you need to check or follow up on, like checking your bank
              account for a direct deposit.
            </p>
            <form onSubmit={(e) => void saveReminder(e)}>
              <div className="form-group">
                <label>Reminder Date *</label>
                <input
                  type="date"
                  value={reminderForm.reminderDate}
                  onChange={(e) => setReminderForm((f) => ({ ...f, reminderDate: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Reminder Note</label>
                <textarea
                  value={reminderForm.reminderNote}
                  onChange={(e) => setReminderForm((f) => ({ ...f, reminderNote: e.target.value }))}
                  style={{ minHeight: 90 }}
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline btn-lg"
                  onClick={() => setShowReminderModal(false)}
                  disabled={savingReminder}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-lg" disabled={savingReminder}>
                  {savingReminder ? "Saving…" : "Save Reminder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showExpenseModal && (
        <div className="modal-overlay" onClick={() => !savingExpense && setShowExpenseModal(false)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: "90vh", overflowY: "auto", maxWidth: 520 }}
          >
            <h3>Add Expense / Receipt</h3>
            <p style={{ color: "var(--muted)", marginBottom: 14, lineHeight: 1.5 }}>
              Save a repair, bill, or other property cost. You can attach a receipt photo or PDF if you have one.
            </p>
            <form onSubmit={(e) => void saveExpense(e)}>
              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  value={expenseForm.expenseDate}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, expenseDate: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {PROPERTY_EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, description: e.target.value }))}
                  style={{ minHeight: 72 }}
                />
              </div>
              <div className="form-group">
                <label>Vendor / Paid To</label>
                <input
                  value={expenseForm.vendorName}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, vendorName: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Amount ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="form-group">
                <label>Payment Method</label>
                <select
                  value={expenseForm.paymentMethod}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                >
                  <option value="">—</option>
                  {PAYMENT_METHOD_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Reference Number</label>
                <input
                  value={expenseForm.referenceNumber}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, referenceNumber: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, notes: e.target.value }))}
                  style={{ minHeight: 72 }}
                />
              </div>
              <div className="form-group">
                <label>Receipt (optional)</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.heic,.heif,.webp,image/*,application/pdf"
                  onChange={(e) => setExpenseReceiptFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline btn-lg"
                  onClick={() => setShowExpenseModal(false)}
                  disabled={savingExpense}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-lg" disabled={savingExpense}>
                  {savingExpense ? "Saving…" : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
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
                </div>
              ) : null}
            </div>
          ))
        ))}
    </div>
  );
}
