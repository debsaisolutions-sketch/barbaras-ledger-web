import { useState } from "react";
import { fmtCurrency, fmtDate, statusBadge } from "../helpers";
import { rentPeriodKey, summarizeVisiblePeriods, type RentPeriodSummary } from "../rentSchedule";
import { updateProperty, type Property, type PropertyTransaction } from "../store";
import ConfirmDialog from "./ConfirmDialog";

function scheduleFrom(property: Property) {
  return {
    frequency: property.rentFrequency,
    expectedAmount: property.monthlyRent,
    dueDay: property.rentDueDay,
    anchorDate: property.rentAnchorDate,
    intervalDays: property.rentIntervalDays,
    leaseStart: property.leaseStartDate,
    skippedPeriods: property.skippedRentPeriods,
  };
}

export default function RentPeriodList({
  property,
  transactions,
  onChanged,
}: {
  property: Property;
  transactions: PropertyTransaction[];
  onChanged: () => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const periods = summarizeVisiblePeriods(
    scheduleFrom(property),
    transactions.map((t) => ({
      id: t.id,
      date: t.date,
      amount: t.paymentAmount,
      type: t.type,
      applyTo: t.applyTo,
      rentPeriodStart: t.rentPeriodStart,
      rentPeriodEnd: t.rentPeriodEnd,
      voidedAt: t.voidedAt,
    })),
    today
  );
  const [pending, setPending] = useState<RentPeriodSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function removePeriod() {
    if (!pending) return;
    setBusy(true);
    setError("");
    try {
      const key = rentPeriodKey(pending);
      const next = [...new Set([...(property.skippedRentPeriods || []), key])];
      await updateProperty(property.id, { skippedRentPeriods: next });
      setPending(null);
      onChanged();
    } catch (err) {
      setError((err as Error).message || "Could not remove that period.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <h3 style={{ marginBottom: 8 }}>Rent periods</h3>
      <p style={{ color: "var(--muted)", marginBottom: 14, lineHeight: 1.5 }}>
        This is the expected schedule. You can still record a payment on any date, for any amount, including
        more than one payment for the same period. Remove a period if it should not count as rent owed.
      </p>
      {property.monthlyRent <= 0 ? (
        <p style={{ color: "var(--muted)", margin: 0 }}>No expected rent amount is saved yet. You can still record payments.</p>
      ) : periods.length === 0 ? (
        <p style={{ color: "var(--muted)", margin: 0 }}>No rent periods are showing.</p>
      ) : (
        periods.map((p) => (
          <PeriodCard key={`${p.start}-${p.end}`} period={p} transactions={transactions} onRemove={() => setPending(p)} />
        ))
      )}
      {pending && (
        <ConfirmDialog
          title="Remove this rent period?"
          confirmLabel="Remove period"
          danger
          busy={busy}
          onCancel={() => !busy && setPending(null)}
          onConfirm={() => void removePeriod()}
        >
          <p style={{ margin: 0 }}>
            {fmtDate(pending.start)} – {fmtDate(pending.end)} will be hidden and will not count as money owed.
            Payments you already recorded stay in the ledger.
          </p>
          {error ? <p style={{ color: "var(--error)" }}>{error}</p> : null}
        </ConfirmDialog>
      )}
    </div>
  );
}

function PeriodCard({
  period,
  transactions,
  onRemove,
}: {
  period: RentPeriodSummary;
  transactions: PropertyTransaction[];
  onRemove: () => void;
}) {
  const rows = transactions.filter((t) => period.paymentIds.includes(t.id));
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <strong>
          {fmtDate(period.start)} – {fmtDate(period.end)}
        </strong>
        <span className={`badge ${statusBadge(period.status)}`}>{period.status}</span>
      </div>
      <p style={{ color: "var(--muted)", margin: "6px 0 10px" }}>
        Due {fmtDate(period.dueDate)}
      </p>
      <div className="detail-info-grid">
        <div className="detail-info-item">
          <label>Expected</label>
          <p>{fmtCurrency(period.expected)}</p>
        </div>
        <div className="detail-info-item">
          <label>Received</label>
          <p>{fmtCurrency(period.received)}</p>
        </div>
        <div className="detail-info-item">
          <label>{period.status === "Upcoming" ? "Not due yet" : "Remaining"}</label>
          <p>{period.status === "Upcoming" ? "Later" : fmtCurrency(period.remaining)}</p>
        </div>
      </div>
      {rows.length > 0 && (
        <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
          {rows.map((t) => (
            <li key={t.id}>
              {fmtDate(t.date)} · {fmtCurrency(t.paymentAmount)}
              {t.paymentMethod ? ` · ${t.paymentMethod}` : ""}
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 10 }} onClick={onRemove}>
        Remove
      </button>
    </div>
  );
}
