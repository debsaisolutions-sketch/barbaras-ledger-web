/** Per-tenant rent balances. History stays on the property; money does not cross leases. */

import {
  money,
  paidByPriorTenant,
  summarizeVisiblePeriods,
  unpaidForDashboard,
  type RentFrequency,
  type RentPaymentInput,
  type RentScheduleInput,
} from "./rentSchedule";

export interface BalanceProperty {
  id: string;
  propertyName: string;
  tenantName: string;
  coTenantName: string;
  priorTenantName: string;
  leaseStartDate: string;
  rentFrequency: RentFrequency;
  monthlyRent: number;
  rentDueDay: number;
  rentAnchorDate: string;
  rentIntervalDays: number | null;
  skippedRentPeriods?: string[];
  status?: string;
}

export interface BalanceTransaction {
  id?: string;
  propertyId: string;
  date: string;
  type: string;
  applyTo: string;
  chargeAmount: number;
  paymentAmount: number;
  rentPeriodStart: string;
  rentPeriodEnd: string;
  voidedAt?: string;
  tenantName?: string;
}

export interface CarriedFromUnit {
  propertyId: string;
  propertyName: string;
  amount: number;
}

export interface PropertyMoney {
  propertyId: string;
  propertyName: string;
  currentBalance: number;
  priorBalance: number;
  priorTenantName: string;
  /** Unpaid prior-tenant balances from other units where this household now lives. */
  carried: CarriedFromUnit[];
  /** Current lease on this unit, plus carried balances for these occupants. */
  householdBalance: number;
  /** Homes whose displayed total already includes this unit's prior balance. */
  includedOn: { propertyId: string; propertyName: string }[];
}

export function samePersonName(a: string, b: string): boolean {
  const norm = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
  const left = norm(a);
  const right = norm(b);
  return left.length > 0 && left === right;
}

export function currentOccupantNames(property: {
  tenantName: string;
  coTenantName: string;
}): string[] {
  return [property.tenantName, property.coTenantName].map((name) => name.trim()).filter(Boolean);
}

/** Saved tenant name wins. Otherwise a date before the lease start belongs to the previous tenant. */
export function transactionBelongsToPriorTenant(input: {
  date: string;
  tenantName?: string;
  leaseStart: string;
  priorTenantName: string;
  currentTenantNames: string[];
}): boolean {
  const explicit = (input.tenantName || "").trim();
  const prior = input.priorTenantName.trim();
  if (explicit) {
    if (prior && samePersonName(explicit, prior)) return true;
    const occupants = input.currentTenantNames.filter((name) => name.trim());
    if (occupants.some((name) => samePersonName(explicit, name))) return false;
    if (samePersonName(explicit, occupants.join(" and "))) return false;
  }
  return paidByPriorTenant(input.date, input.leaseStart, prior);
}

export function transactionTenantLabel(input: {
  date: string;
  explicitTenantName?: string;
  leaseStart: string;
  priorTenantName: string;
  currentTenantNames: string[];
}): string {
  const explicit = (input.explicitTenantName || "").trim();
  if (explicit) return explicit;
  if (
    transactionBelongsToPriorTenant({
      date: input.date,
      tenantName: "",
      leaseStart: input.leaseStart,
      priorTenantName: input.priorTenantName,
      currentTenantNames: input.currentTenantNames,
    })
  ) {
    return input.priorTenantName.trim();
  }
  return input.currentTenantNames.map((name) => name.trim()).filter(Boolean).join(" and ");
}

export function ledgerBalance(
  transactions: Array<{ voidedAt?: string; chargeAmount: number; paymentAmount: number }>
): number {
  let balance = 0;
  for (const txn of transactions) {
    if (txn.voidedAt) continue;
    balance += txn.chargeAmount - txn.paymentAmount;
  }
  return Math.max(0, money(balance));
}

function asPayments(transactions: BalanceTransaction[]): RentPaymentInput[] {
  return transactions.map((txn, index) => ({
    id: txn.id || String(index),
    date: txn.date,
    amount: txn.paymentAmount,
    type: txn.type,
    applyTo: txn.applyTo,
    rentPeriodStart: txn.rentPeriodStart,
    rentPeriodEnd: txn.rentPeriodEnd,
    voidedAt: txn.voidedAt || "",
  }));
}

function scheduleFor(property: BalanceProperty): RentScheduleInput {
  return {
    frequency: property.rentFrequency,
    expectedAmount: property.monthlyRent,
    dueDay: property.rentDueDay,
    anchorDate: property.rentAnchorDate,
    intervalDays: property.rentIntervalDays,
    leaseStart: property.leaseStartDate,
    skippedPeriods: property.skippedRentPeriods || [],
  };
}

/**
 * Schedule-mode balance for the current lease.
 * Counts the open current period, plus any earlier period that was only partly paid.
 * A past month with no payment at all stays off this number, matching the older dashboard rule.
 */
export function owedOnSchedule(
  schedule: RentScheduleInput,
  transactions: BalanceTransaction[],
  today: string
): number {
  const periods = summarizeVisiblePeriods(schedule, asPayments(transactions), today);
  const current = periods.find((period) => period.start <= today && today <= period.end);
  let owed = 0;
  if (
    current &&
    current.status !== "Paid" &&
    current.status !== "Overpaid" &&
    current.status !== "Upcoming"
  ) {
    owed += current.remaining;
  }
  for (const period of periods) {
    if (current && period.start === current.start && period.end === current.end) continue;
    if (period.end > today) continue;
    if (period.status === "Partial") owed += period.remaining;
  }
  return money(owed);
}

function currentLeaseBalance(
  property: BalanceProperty,
  transactions: BalanceTransaction[],
  today: string
): number {
  const schedule = scheduleFor(property);
  const hasCharges = transactions.some((txn) => !txn.voidedAt && txn.chargeAmount > 0);
  if (hasCharges) {
    return unpaidForDashboard({ schedule, transactions, today });
  }
  if (money(property.monthlyRent) <= 0) return 0;
  return owedOnSchedule(schedule, transactions, today);
}

export function summarizePropertyMoney(
  properties: BalanceProperty[],
  transactions: BalanceTransaction[],
  today: string
): PropertyMoney[] {
  const units = properties.map((property) => {
    const occupants = currentOccupantNames(property);
    const mine = transactions.filter((txn) => txn.propertyId === property.id);
    const priorTxns: BalanceTransaction[] = [];
    const currentTxns: BalanceTransaction[] = [];
    for (const txn of mine) {
      if (
        transactionBelongsToPriorTenant({
          date: txn.date,
          tenantName: txn.tenantName,
          leaseStart: property.leaseStartDate,
          priorTenantName: property.priorTenantName,
          currentTenantNames: occupants,
        })
      ) {
        priorTxns.push(txn);
      } else {
        currentTxns.push(txn);
      }
    }
    return {
      propertyId: property.id,
      propertyName: property.propertyName,
      occupants,
      currentBalance: currentLeaseBalance(property, currentTxns, today),
      priorBalance: property.priorTenantName.trim() ? ledgerBalance(priorTxns) : 0,
      priorTenantName: property.priorTenantName.trim(),
    };
  });

  const withCarry = units.map((unit) => {
    const carried = units
      .filter((other) => other.propertyId !== unit.propertyId && other.priorBalance > 0)
      .filter((other) => unit.occupants.some((name) => samePersonName(name, other.priorTenantName)))
      .map((other) => ({
        propertyId: other.propertyId,
        propertyName: other.propertyName,
        amount: other.priorBalance,
      }));
    return {
      propertyId: unit.propertyId,
      propertyName: unit.propertyName,
      currentBalance: unit.currentBalance,
      priorBalance: unit.priorBalance,
      priorTenantName: unit.priorTenantName,
      carried,
      householdBalance: money(unit.currentBalance + carried.reduce((sum, item) => sum + item.amount, 0)),
      includedOn: [] as { propertyId: string; propertyName: string }[],
    };
  });

  return withCarry.map((unit) => ({
    ...unit,
    includedOn: withCarry
      .filter((other) => other.carried.some((item) => item.propertyId === unit.propertyId))
      .map((other) => ({ propertyId: other.propertyId, propertyName: other.propertyName })),
  }));
}

/** Dashboard total: each lease is added once. A balance carried onto another home is not added twice. */
export function unpaidRentForProperties(
  properties: Array<{ id: string; status: string }>,
  rows: PropertyMoney[]
): number {
  let total = 0;
  for (const property of properties) {
    if (property.status !== "Active" && property.status !== "Past Due") continue;
    const row = rows.find((item) => item.propertyId === property.id);
    if (!row) continue;
    total += row.currentBalance + row.priorBalance;
  }
  return money(total);
}
