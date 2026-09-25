/** Pure rent-schedule and record rules. No database access. */

export type RentFrequency = "weekly" | "biweekly" | "monthly" | "custom";

export type RentPeriodStatus = "Paid" | "Partial" | "Unpaid" | "Overdue" | "Overpaid" | "Upcoming";

export const REPAIR_STATUSES = [
  "Needs Attention",
  "Planned",
  "Waiting on Funds",
  "Scheduled",
  "In Progress",
  "Completed",
] as const;
export type RepairStatus = (typeof REPAIR_STATUSES)[number];

export const REPAIR_PRIORITIES = ["Low", "Normal", "High"] as const;
export type RepairPriority = (typeof REPAIR_PRIORITIES)[number];

export const RENT_FREQUENCY_OPTIONS: { value: RentFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every two weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom" },
];

export interface RentPeriod {
  start: string;
  end: string;
  dueDate: string;
  expected: number;
}

export interface RentPaymentInput {
  id: string;
  date: string;
  amount: number;
  type: string;
  applyTo: string;
  rentPeriodStart: string;
  rentPeriodEnd: string;
  voidedAt: string;
}

export interface RentPeriodSummary extends RentPeriod {
  received: number;
  remaining: number;
  status: RentPeriodStatus;
  paymentIds: string[];
}

export interface RentScheduleInput {
  frequency: RentFrequency;
  expectedAmount: number;
  dueDay: number;
  anchorDate: string;
  intervalDays: number | null;
  leaseStart?: string;
}

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: string): boolean {
  if (!ISO.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function money(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function daysBetween(start: string, end: string): number {
  const ms = Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`);
  return Math.round(ms / 86400000);
}

export function normalizeRentFrequency(raw: unknown): RentFrequency {
  if (raw === "weekly" || raw === "biweekly" || raw === "monthly" || raw === "custom") return raw;
  return "monthly";
}

export function rentFrequencyLabel(frequency: RentFrequency): string {
  return RENT_FREQUENCY_OPTIONS.find((o) => o.value === frequency)?.label ?? "Monthly";
}

export function intervalStep(frequency: RentFrequency, intervalDays: number | null): number {
  if (frequency === "weekly") return 7;
  if (frequency === "biweekly") return 14;
  if (frequency === "custom") {
    const n = intervalDays == null ? 30 : Math.round(intervalDays);
    return Number.isFinite(n) && n >= 1 ? n : 30;
  }
  return 0;
}

/** Missing loan flag means "no loan entered" so existing properties stay usable. */
export function normalizeLoanPaidOff(raw: unknown): boolean {
  if (raw === false || raw === "false" || raw === 0) return false;
  return true;
}

export function normalizeRepairStatus(raw: unknown): RepairStatus {
  if (typeof raw === "string" && (REPAIR_STATUSES as readonly string[]).includes(raw)) {
    return raw as RepairStatus;
  }
  return "Completed";
}

export function normalizeRepairPriority(raw: unknown): RepairPriority {
  if (raw === "Low" || raw === "Normal" || raw === "High") return raw;
  return "Normal";
}

export function optionalMoney(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = typeof raw === "number" ? raw : parseFloat(String(raw));
  if (!Number.isFinite(n)) return null;
  return money(n);
}

export function rentPeriodStatus(
  expected: number,
  received: number,
  periodEnd: string,
  today: string,
  periodStart = ""
): RentPeriodStatus {
  const exp = money(expected);
  const rec = money(received);
  if (rec > exp + 0.009) return "Overpaid";
  if (exp > 0 && rec + 0.009 >= exp) return "Paid";
  if (rec > 0.009) return "Partial";
  if (periodStart && today < periodStart) return "Upcoming";
  if (today > periodEnd) return "Overdue";
  return "Unpaid";
}

export function remainingRent(expected: number, received: number): number {
  return Math.max(0, money(money(expected) - money(received)));
}

export function repairSaveError(input: {
  title: string;
  description: string;
  actualCost: string;
  estimatedCost: string;
}): string | null {
  if (!input.title.trim() && !input.description.trim()) {
    return "Enter what needs to be repaired.";
  }
  if (input.actualCost.trim()) {
    const n = Number(input.actualCost);
    if (!Number.isFinite(n) || n < 0) return "Actual cost must be a number, or leave it blank.";
  }
  if (input.estimatedCost.trim()) {
    const n = Number(input.estimatedCost);
    if (!Number.isFinite(n) || n < 0) return "Estimated cost must be a number, or leave it blank.";
  }
  return null;
}

export function blankMoneyToZero(raw: string): number {
  const t = raw.trim();
  if (!t) return 0;
  return money(Number(t));
}

export function blankMoneyToNull(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  return money(Number(t));
}

export function noteSaveError(text: string): string | null {
  if (!text.trim()) return "Please enter a note.";
  return null;
}

export function reminderSaveError(dueDate: string): string | null {
  if (!dueDate.trim()) return "Please choose a due date.";
  return null;
}

export type RecordKind = "note" | "reminder" | "repair" | "payment" | "charge";

/** Financial rows should be voided first so history is kept. Other records can be deleted. */
export function recommendedRemoval(kind: RecordKind): "delete" | "void" {
  if (kind === "payment" || kind === "charge") return "void";
  return "delete";
}

export function propertySaveError(input: {
  propertyName: string;
  frequency: RentFrequency;
  rentIntervalDays: string;
}): string | null {
  if (!input.propertyName.trim()) return "Property name is required.";
  if (input.frequency === "custom" && input.rentIntervalDays.trim()) {
    const n = parseInt(input.rentIntervalDays, 10);
    if (!Number.isFinite(n) || n < 1) {
      return "Custom frequency needs a number of days (1 or more), or leave it blank.";
    }
  }
  return null;
}

function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function monthPeriod(year: number, monthIndex: number, dueDay: number, expected: number): RentPeriod {
  const month = String(monthIndex + 1).padStart(2, "0");
  const last = lastDayOfMonth(year, monthIndex);
  const due = Math.min(Math.max(Math.round(dueDay) || 1, 1), last);
  const start = `${year}-${month}-01`;
  const end = `${year}-${month}-${String(last).padStart(2, "0")}`;
  const dueDate = `${year}-${month}-${String(due).padStart(2, "0")}`;
  return { start, end, dueDate, expected: money(expected) };
}

export function intervalPeriodContaining(
  anchor: string,
  step: number,
  day: string,
  expected: number
): RentPeriod {
  const stepSafe = Math.max(1, Math.round(step) || 1);
  const safeDay = isIsoDate(day) ? day : anchor;
  const diff = daysBetween(anchor, safeDay);
  const n = Math.floor(diff / stepSafe);
  const start = addDays(anchor, n * stepSafe);
  const end = addDays(start, stepSafe - 1);
  return { start, end, dueDate: start, expected: money(expected) };
}

function resolveAnchor(schedule: RentScheduleInput, today: string): string {
  if (schedule.anchorDate && isIsoDate(schedule.anchorDate)) return schedule.anchorDate;
  if (schedule.leaseStart && isIsoDate(schedule.leaseStart)) return schedule.leaseStart;
  return today;
}

function periodKey(p: { start: string; end: string }): string {
  return `${p.start}|${p.end}`;
}

function shiftMonth(year: number, monthIndex: number, delta: number): { y: number; m: number } {
  const dt = new Date(Date.UTC(year, monthIndex + delta, 1));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() };
}

export function periodForDate(schedule: RentScheduleInput, day: string, today: string): RentPeriod {
  const expected = money(schedule.expectedAmount);
  if (schedule.frequency === "monthly") {
    const iso = isIsoDate(day) ? day : today;
    const [y, m] = iso.split("-").map(Number);
    return monthPeriod(y, m - 1, schedule.dueDay || 1, expected);
  }
  const anchor = resolveAnchor(schedule, today);
  const step = intervalStep(schedule.frequency, schedule.intervalDays);
  return intervalPeriodContaining(anchor, step, day, expected);
}

function isRentPayment(payment: RentPaymentInput): boolean {
  if (payment.voidedAt) return false;
  if (payment.type !== "payment") return false;
  if (payment.applyTo && payment.applyTo !== "Rent") return false;
  return money(payment.amount) > 0;
}

function paymentMatchesPeriod(period: RentPeriod, payment: RentPaymentInput): boolean {
  if (!isRentPayment(payment)) return false;
  if (payment.rentPeriodStart && payment.rentPeriodEnd) {
    return payment.rentPeriodStart === period.start && payment.rentPeriodEnd === period.end;
  }
  return payment.date >= period.start && payment.date <= period.end;
}

export function summarizePeriod(
  period: RentPeriod,
  payments: RentPaymentInput[],
  today: string
): RentPeriodSummary {
  const matched = payments.filter((p) => paymentMatchesPeriod(period, p));
  const received = money(matched.reduce((sum, p) => sum + money(p.amount), 0));
  return {
    ...period,
    received,
    remaining: remainingRent(period.expected, received),
    status: rentPeriodStatus(period.expected, received, period.end, today, period.start),
    paymentIds: matched.map((p) => p.id),
  };
}

/** Previous, current, and next periods, plus any period that already has a rent payment. */
export function visibleRentPeriods(
  schedule: RentScheduleInput,
  payments: RentPaymentInput[],
  today: string
): RentPeriod[] {
  const expected = money(schedule.expectedAmount);
  const map = new Map<string, RentPeriod>();
  const add = (p: RentPeriod) => map.set(periodKey(p), p);

  if (schedule.frequency === "monthly") {
    const iso = isIsoDate(today) ? today : new Date().toISOString().slice(0, 10);
    const [y, m] = iso.split("-").map(Number);
    for (const delta of [-1, 0, 1]) {
      const shifted = shiftMonth(y, m - 1, delta);
      add(monthPeriod(shifted.y, shifted.m, schedule.dueDay || 1, expected));
    }
  } else {
    const anchor = resolveAnchor(schedule, today);
    const step = intervalStep(schedule.frequency, schedule.intervalDays);
    const current = intervalPeriodContaining(anchor, step, today, expected);
    add(intervalPeriodContaining(anchor, step, addDays(current.start, -1), expected));
    add(current);
    add(intervalPeriodContaining(anchor, step, addDays(current.end, 1), expected));
  }

  for (const payment of payments) {
    if (!isRentPayment(payment)) continue;
    if (payment.rentPeriodStart && payment.rentPeriodEnd && isIsoDate(payment.rentPeriodStart)) {
      add({
        start: payment.rentPeriodStart,
        end: payment.rentPeriodEnd,
        dueDate: payment.rentPeriodStart,
        expected,
      });
      continue;
    }
    if (isIsoDate(payment.date)) add(periodForDate(schedule, payment.date, today));
  }

  const anchor = schedule.frequency === "monthly" ? "" : resolveAnchor(schedule, today);
  return [...map.values()]
    .filter((period) => !anchor || period.end >= anchor)
    .sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
}

export function summarizeVisiblePeriods(
  schedule: RentScheduleInput,
  payments: RentPaymentInput[],
  today: string
): RentPeriodSummary[] {
  return visibleRentPeriods(schedule, payments, today).map((p) => summarizePeriod(p, payments, today));
}

export function formatPeriodLabel(period: RentPeriod): string {
  return `${period.start} to ${period.end}`;
}

interface LedgerTxn {
  voidedAt?: string;
  chargeAmount: number;
  paymentAmount: number;
}

/** Existing properties that already have charges keep the ledger balance. New ones use this period. */
export function unpaidForDashboard(input: {
  schedule: RentScheduleInput;
  transactions: Array<
    LedgerTxn & {
      type: string;
      applyTo: string;
      date: string;
      rentPeriodStart: string;
      rentPeriodEnd: string;
      id?: string;
    }
  >;
  today: string;
}): number {
  const hasCharges = input.transactions.some((t) => !t.voidedAt && t.chargeAmount > 0);
  if (hasCharges) {
    let balance = 0;
    for (const t of input.transactions) {
      if (t.voidedAt) continue;
      balance += t.chargeAmount - t.paymentAmount;
    }
    return Math.max(0, money(balance));
  }
  if (money(input.schedule.expectedAmount) <= 0) return 0;
  const periods = summarizeVisiblePeriods(
    input.schedule,
    input.transactions.map((t, i) => ({
      id: t.id || String(i),
      date: t.date,
      amount: t.paymentAmount,
      type: t.type,
      applyTo: t.applyTo,
      rentPeriodStart: t.rentPeriodStart,
      rentPeriodEnd: t.rentPeriodEnd,
      voidedAt: t.voidedAt || "",
    })),
    input.today
  );
  const current = periods.find((p) => p.start <= input.today && input.today <= p.end);
  if (!current || current.status === "Paid" || current.status === "Overpaid") return 0;
  return current.remaining;
}

export function noteBelongsToProperty(
  note: { relatedType: string; relatedId: string; propertyId?: string | null },
  propertyId: string
): boolean {
  if (note.propertyId && note.propertyId === propertyId) return true;
  if ((note.relatedType === "property" || note.relatedType === "tenant") && note.relatedId === propertyId) {
    return true;
  }
  return false;
}
