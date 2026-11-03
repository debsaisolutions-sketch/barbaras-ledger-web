import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getProperties,
  getAllPropertyTransactions,
  type Property,
} from "../store";
import {
  backRentByTenant,
  matchesPropertyStatusFilter,
  propertyListStatus,
  summarizePropertyMoney,
  type PropertyMoney,
} from "../tenantBalances";
import { fmtCurrency, fmtDate, statusBadge } from "../helpers";
import { occupantLabel } from "../occupants";
import { useRefresh } from "../App";

export function RentalPropertyCard({
  property: p,
  onOpen,
}: {
  property: Property & PropertyMoney;
  onOpen: () => void;
}) {
  const shownStatus = propertyListStatus(p);
  const backRent = backRentByTenant(p.carried);
  return (
    <div className="list-item" onClick={onOpen}>
      <span className="item-icon">🏠</span>
      <div className="item-content">
        <div className="item-title">{p.propertyName}</div>
        <div className="item-subtitle">
          {occupantLabel(p) || "No tenant"} · {p.address}
          {p.status === "Sold" && (p.salePrice != null || p.soldDate) ? (
            <>
              {" "}
              · Sold
              {p.soldDate ? ` ${fmtDate(p.soldDate)}` : ""}
              {p.salePrice != null ? ` · ${fmtCurrency(p.salePrice)}` : ""}
            </>
          ) : null}
        </div>
        {backRent.map((line) => (
          <div key={line.tenantName} className="item-subtitle" style={{ color: "var(--error)" }}>
            {line.tenantName} back rent: {fmtCurrency(line.amount)}
          </div>
        ))}
        {p.priorBalance > 0 && p.includedOn.length === 0 && (
          <div className="item-subtitle" style={{ color: "var(--error)" }}>
            {p.priorTenantName || "Previous tenant"} still owes {fmtCurrency(p.priorBalance)} on this unit
          </div>
        )}
      </div>
      <div className="item-right">
        <div
          className="item-amount"
          style={{ color: p.currentBalance > 0 ? "var(--error)" : "var(--success)" }}
        >
          {p.currentBalance > 0 ? `${fmtCurrency(p.currentBalance)} due` : "Paid up"}
        </div>
        {backRent.map((line) => (
          <div key={line.tenantName} style={{ color: "var(--error)", fontWeight: 700, fontSize: 14 }}>
            Back rent {fmtCurrency(line.amount)}
          </div>
        ))}
        <span className={`badge ${statusBadge(shownStatus)}`}>{shownStatus}</span>
      </div>
      <span className="item-arrow">›</span>
    </div>
  );
}

export default function Properties() {
  const navigate = useNavigate();
  const { key } = useRefresh();
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [properties, setProperties] = useState<(Property & PropertyMoney)[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [props, txns] = await Promise.all([getProperties(), getAllPropertyTransactions()]);
        if (cancelled) return;
        const summary = summarizePropertyMoney(props, txns, new Date().toISOString().slice(0, 10));
        const enriched = props.map((p) => {
          const money = summary.find((row) => row.propertyId === p.id);
          return {
            ...p,
            propertyId: p.id,
            propertyName: p.propertyName,
            currentBalance: money?.currentBalance ?? 0,
            priorBalance: money?.priorBalance ?? 0,
            priorTenantName: money?.priorTenantName ?? p.priorTenantName,
            carried: money?.carried ?? [],
            householdBalance: money?.householdBalance ?? 0,
            includedOn: money?.includedOn ?? [],
          };
        });
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
    .filter((p) => matchesPropertyStatusFilter(p, filter))
    .filter(
      (p) =>
        !search ||
        [p.propertyName, p.tenantName, p.coTenantName, p.priorTenantName, p.address].some((f) =>
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
          <RentalPropertyCard key={p.id} property={p} onOpen={() => navigate(`/properties/${p.id}`)} />
        ))
      )}
    </div>
  );
}
