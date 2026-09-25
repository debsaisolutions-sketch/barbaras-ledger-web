import { fmtCurrency, fmtDate, statusBadge } from "../helpers";
import { summarizeVisiblePeriods, type RentPeriodSummary } from "../rentSchedule";
import type { Property, PropertyTransaction } from "../store";

function scheduleFrom(property: Property) {
  return {
    frequency: property.rentFrequency,
    expectedAmount: property.monthlyRent,
    dueDay: property.rentDueDay,
    anchorDate: property.rentAnchorDate,
    intervalDays: property.rentIntervalDays,
    leaseStart: property.leaseStartDate,
  };
}

export default function RentPeriodList({
  property,
  transactions,
}: {
  property: Property;
  transactions: PropertyTransaction[];
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

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <h3 style={{ marginBottom: 8 }}>Rent periods</h3>
      <p style={{ color: "var(--muted)", marginBottom: 14, lineHeight: 1.5 }}>
        This is the expected schedule. You can still record a payment on any date, for any amount, including
        more than one payment for the same period.
      </p>
      {property.monthlyRent <= 0 ? (
        <p style={{ color: "var(--muted)", margin: 0 }}>No expected rent amount is saved yet. You can still record payments.</p>
      ) : (
        periods.map((p) => <PeriodCard key={`${p.start}-${p.end}`} period={p} transactions={transactions} />)
      )}
    </div>
  );
}

function PeriodCard({
  period,
  transactions,
}: {
  period: RentPeriodSummary;
  transactions: PropertyTransaction[];
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
      <p style={{ color: "var(--muted)", margin: "6px 0 10px" }}>Due {fmtDate(period.dueDate)}</p>
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
    </div>
  );
}
