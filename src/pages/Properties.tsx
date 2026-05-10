import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getProperties,
  getAllPropertyTransactions,
  calculatePropertyBalance,
  type Property,
} from "../store";
import { fmtCurrency, fmtDate, statusBadge } from "../helpers";
import { useRefresh } from "../App";

export default function Properties() {
  const navigate = useNavigate();
  const { key } = useRefresh();
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [properties, setProperties] = useState<(Property & { balance: number })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [props, txns] = await Promise.all([getProperties(), getAllPropertyTransactions()]);
        if (cancelled) return;
        const enriched = props.map((p) => ({
          ...p,
          balance: calculatePropertyBalance(txns.filter((t) => t.propertyId === p.id)),
        }));
        setProperties(enriched);
      } catch (e) {
        if (!cancelled) alert((e as Error).message || "Could not load properties.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  const filters = ["All", "Active", "Past Due", "Vacant", "Sold", "Closed"];
  const filtered = properties
    .filter((p) => filter === "All" || p.status === filter)
    .filter(
      (p) =>
        !search ||
        [p.propertyName, p.tenantName, p.address].some((f) =>
          f?.toLowerCase().includes(search.toLowerCase())
        )
    );

  if (loading) {
    return (
      <div className="empty-state" style={{ padding: 40 }}>
        <p>Loading properties…</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>Rental Properties</h2>
        <button className="btn btn-primary" onClick={() => navigate("/properties/new")}>
          + Add Property
        </button>
      </div>

      <div className="form-group" style={{ marginBottom: 16 }}>
        <input
          placeholder="Search properties..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="filter-row">
        {filters.map((f) => (
          <button
            key={f}
            className={`chip ${filter === f ? "active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏢</div>
          <h3>No Properties Found</h3>
          <p>
            {properties.length === 0
              ? "Add your first rental property to get started."
              : "No properties match your filter."}
          </p>
          {properties.length === 0 && (
            <button
              className="btn btn-primary"
              style={{ marginTop: 16 }}
              onClick={() => navigate("/properties/new")}
            >
              + Add Property
            </button>
          )}
        </div>
      ) : (
        filtered.map((p) => (
          <div key={p.id} className="list-item" onClick={() => navigate(`/properties/${p.id}`)}>
            <span className="item-icon">🏠</span>
            <div className="item-content">
              <div className="item-title">{p.propertyName}</div>
              <div className="item-subtitle">
                {p.tenantName || "No tenant"} · {p.address}
                {p.status === "Sold" && (p.salePrice != null || p.soldDate) ? (
                  <>
                    {" "}
                    · Sold
                    {p.soldDate ? ` ${fmtDate(p.soldDate)}` : ""}
                    {p.salePrice != null ? ` · ${fmtCurrency(p.salePrice)}` : ""}
                  </>
                ) : null}
              </div>
            </div>
            <div className="item-right">
              <div
                className="item-amount"
                style={{ color: p.balance > 0 ? "var(--error)" : "var(--success)" }}
              >
                {p.balance > 0 ? `${fmtCurrency(p.balance)} due` : "Paid up"}
              </div>
              <span className={`badge ${statusBadge(p.status)}`}>{p.status}</span>
            </div>
            <span className="item-arrow">›</span>
          </div>
        ))
      )}
    </div>
  );
}
