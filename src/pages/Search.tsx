import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { searchAll, type Document } from "../store";
import { fmtCurrency, fmtDate } from "../helpers";
import { openDocumentInNewTab } from "../documentFiles";

type SearchResults = Awaited<ReturnType<typeof searchAll>>;

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResults>({
    properties: [],
    loans: [],
    notes: [],
    documents: [],
    payments: [],
  });

  const runSearch = async () => {
    const q = query.trim();
    if (!q) {
      setResults({ properties: [], loans: [], notes: [], documents: [], payments: [] });
      return;
    }
    try {
      setLoading(true);
      const found = await searchAll(q);
      setResults(found);
    } catch (e) {
      alert((e as Error).message || "Could not search right now.");
    } finally {
      setLoading(false);
    }
  };

  const openDocument = async (d: Document) => {
    if (!d.storagePath) {
      alert("This document does not have an attached file to open.");
      return;
    }
    const ok = await openDocumentInNewTab(d.storagePath);
    if (!ok) alert("Could not open document.");
  };

  const totalCount =
    results.properties.length +
    results.loans.length +
    results.documents.length +
    results.notes.length +
    results.payments.length;

  return (
    <div>
      <div className="page-header">
        <h2>Search Records</h2>
      </div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label>Search</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a name, address, check number, or note to search."
            style={{ fontSize: 20, padding: "14px 16px" }}
            onKeyDown={(e) => {
              if (e.key === "Enter") void runSearch();
            }}
          />
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => void runSearch()} disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {!query.trim() ? (
        <div className="empty-state">
          <p>Type a name, address, check number, or note to search.</p>
        </div>
      ) : (
        <>
          <p style={{ color: "var(--muted)", marginBottom: 12 }}>
            {totalCount} result{totalCount === 1 ? "" : "s"} found.
          </p>

          <div className="card" style={{ marginBottom: 12 }}>
            <h3 style={{ marginBottom: 10 }}>Properties</h3>
            {results.properties.length === 0 ? (
              <p style={{ color: "var(--muted)" }}>No property matches.</p>
            ) : (
              results.properties.map((p) => (
                <div key={p.id} className="list-item" style={{ cursor: "default" }}>
                  <div className="item-content">
                    <div className="item-title">{p.propertyName}</div>
                    <div className="item-subtitle">
                      {p.address || "—"} · Tenant: {p.tenantName || "—"}
                    </div>
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={() => navigate(`/properties/${p.id}`)}>
                    Open Property
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="card" style={{ marginBottom: 12 }}>
            <h3 style={{ marginBottom: 10 }}>Loans</h3>
            {results.loans.length === 0 ? (
              <p style={{ color: "var(--muted)" }}>No loan matches.</p>
            ) : (
              results.loans.map((l) => (
                <div key={l.id} className="list-item" style={{ cursor: "default" }}>
                  <div className="item-content">
                    <div className="item-title">Loan to {l.borrowerName}</div>
                    <div className="item-subtitle">{l.relationship || "Personal loan"}</div>
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={() => navigate(`/loans/${l.id}`)}>
                    Open Loan
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="card" style={{ marginBottom: 12 }}>
            <h3 style={{ marginBottom: 10 }}>Documents</h3>
            {results.documents.length === 0 ? (
              <p style={{ color: "var(--muted)" }}>No document matches.</p>
            ) : (
              results.documents.map((d) => (
                <div key={d.id} className="list-item" style={{ cursor: "default" }}>
                  <div className="item-content">
                    <div className="item-title">{d.documentName}</div>
                    <div className="item-subtitle">
                      {d.documentType} · {fmtDate(d.uploadedAt.split("T")[0])}
                    </div>
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={() => void openDocument(d)}>
                    Open Document
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="card" style={{ marginBottom: 12 }}>
            <h3 style={{ marginBottom: 10 }}>Notes</h3>
            {results.notes.length === 0 ? (
              <p style={{ color: "var(--muted)" }}>No note matches.</p>
            ) : (
              results.notes.map((n) => (
                <div key={n.id} className="list-item" style={{ cursor: "default" }}>
                  <div className="item-content">
                    <div className="item-title">{fmtDate(n.noteDate)}</div>
                    <div className="item-subtitle">{n.noteText}</div>
                  </div>
                  {n.relatedType === "property" ? (
                    <button className="btn btn-outline btn-sm" onClick={() => navigate(`/properties/${n.relatedId}`)}>
                      Open Property
                    </button>
                  ) : n.relatedType === "loan" ? (
                    <button className="btn btn-outline btn-sm" onClick={() => navigate(`/loans/${n.relatedId}`)}>
                      Open Loan
                    </button>
                  ) : null}
                </div>
              ))
            )}
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 10 }}>Payments</h3>
            {results.payments.length === 0 ? (
              <p style={{ color: "var(--muted)" }}>No payment/check/reference matches.</p>
            ) : (
              results.payments.map((p) => (
                <div key={`${p.entityType}-${p.id}`} className="list-item" style={{ cursor: "default" }}>
                  <div className="item-content">
                    <div className="item-title">{p.entityLabel}</div>
                    <div className="item-subtitle">
                      {fmtDate(p.date)} · {p.description || "Payment/charge"} · {fmtCurrency(p.amount)}
                      {p.checkNumber ? ` · Check #${p.checkNumber}` : ""}
                      {p.referenceNumber ? ` · Ref: ${p.referenceNumber}` : ""}
                    </div>
                  </div>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => navigate(p.entityType === "property" ? `/properties/${p.entityId}` : `/loans/${p.entityId}`)}
                  >
                    {p.entityType === "property" ? "Open Property" : "Open Loan"}
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
