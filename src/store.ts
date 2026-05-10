// ============ TYPES ============

import type { User } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";

export type PropertyStatus = "Active" | "Vacant" | "Past Due" | "Closed" | "Sold";
export type LoanStatus = "Active" | "Paid Off" | "Past Due" | "Written Off";

export const PAYMENT_METHOD_OPTIONS = [
  "Cash",
  "Check",
  "Direct deposit",
  "Bank transfer",
  "Zelle",
  "Venmo",
  "Cash App",
  "Other",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHOD_OPTIONS)[number] | "";

export function normalizePaymentMethod(raw: string): PaymentMethod | "" {
  const s = (raw || "").trim();
  if (!s) return "";
  if (s === "Bank Transfer") return "Bank transfer";
  for (const m of PAYMENT_METHOD_OPTIONS) {
    if (m === s) return m;
  }
  return "Other";
}
export type TransactionType = "charge" | "payment" | "late_fee" | "adjustment";
export type LoanTransactionType = "charge" | "payment" | "adjustment";
export type DocumentType =
  | "Rental Agreement"
  | "Lease"
  | "Loan Agreement"
  | "Receipt"
  | "Check Image"
  | "Payment Proof"
  | "Tax Document"
  | "Other"
  | "Template";
export type ApplyTo = "Rent" | "Late Fee" | "Other Charge";

export interface Property {
  id: string;
  propertyName: string;
  address: string;
  tenantName: string;
  tenantContact: string;
  tenantPhone: string;
  tenantEmail: string;
  monthlyRent: number;
  rentDueDay: number;
  leaseStartDate: string;
  leaseEndDate: string;
  securityDeposit: number;
  status: PropertyStatus;
  notes: string;
  soldDate: string;
  salePrice: number | null;
  buyerName: string;
  saleNotes: string;
  nextReminderDate: string;
  reminderNote: string;
  reminderCompleted: boolean;
  reminderCompletedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyTransaction {
  id: string;
  propertyId: string;
  date: string;
  type: TransactionType;
  description: string;
  chargeAmount: number;
  paymentAmount: number;
  paymentMethod: PaymentMethod | "";
  checkNumber: string;
  referenceNumber: string;
  applyTo: ApplyTo;
  notes: string;
  createdAt: string;
}

export interface Loan {
  id: string;
  borrowerName: string;
  borrowerPhone: string;
  borrowerEmail: string;
  relationship: string;
  originalAmount: number;
  loanDate: string;
  interestRate: number;
  paymentDueDate: string;
  expectedMonthlyPayment: number;
  status: LoanStatus;
  notes: string;
  nextReminderDate: string;
  reminderNote: string;
  reminderCompleted: boolean;
  reminderCompletedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoanTransaction {
  id: string;
  loanId: string;
  date: string;
  type: LoanTransactionType;
  description: string;
  chargeAmount: number;
  paymentAmount: number;
  paymentMethod: PaymentMethod | "";
  checkNumber: string;
  referenceNumber: string;
  notes: string;
  createdAt: string;
}

export interface Note {
  id: string;
  relatedType: "property" | "loan" | "general";
  relatedId: string;
  noteDate: string;
  noteText: string;
  reminderDate: string;
  createdAt: string;
}

export interface Document {
  id: string;
  documentName: string;
  documentType: DocumentType;
  relatedType: "property" | "loan" | "general" | "template";
  relatedId: string;
  /** Template text for pasted templates; empty when file-only. */
  fileUri: string;
  notes: string;
  uploadedAt: string;
  /** Storage object path inside bucket `barbara-documents` when a file is stored. */
  storagePath?: string | null;
  originalFileName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  propertyTransactionId?: string | null;
  loanTransactionId?: string | null;
}

export interface ActivityItem {
  id: string;
  date: string;
  type: "payment" | "note" | "late_fee" | "document" | "charge";
  entityType: "property" | "loan";
  entityId: string;
  entityName: string;
  personName: string;
  amount: number;
  description: string;
}

// ============ Barbara-only Supabase names ============
const T = {
  PROPERTIES: "barbara_properties",
  PROP_TXN: "barbara_property_transactions",
  LOANS: "barbara_loans",
  LOAN_TXN: "barbara_loan_transactions",
  NOTES: "barbara_notes",
  DOCUMENTS: "barbara_documents",
  ACTIVITIES: "barbara_activities",
  SETTINGS: "barbara_settings",
} as const;

export const DEFAULT_LEDGER_PRODUCT_NAME = "EasyLedger";
export const DEFAULT_LEDGER_SUBTITLE =
  "Simple records for properties, loans, payments, and documents.";

export const BARBARA_DOCUMENTS_BUCKET = "barbara-documents";

const ALLOWED_UPLOAD_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
]);

export function isAllowedDocumentMime(mime: string): boolean {
  const m = mime.toLowerCase().split(";")[0].trim();
  return ALLOWED_UPLOAD_MIME.has(m);
}

function safeUploadFileName(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._\- ]/g, "_").trim() || "document";
  return base.slice(0, 180);
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function num(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

function dateStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.split("T")[0];
  return "";
}

async function requireUser(): Promise<User> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("You must be signed in to continue.");
  return user;
}

function mapProperty(row: Record<string, unknown>): Property {
  const sp = row.sale_price;
  return {
    id: String(row.id),
    propertyName: String(row.property_name ?? ""),
    address: String(row.address ?? ""),
    tenantName: String(row.tenant_name ?? ""),
    tenantContact: String(row.tenant_contact ?? ""),
    tenantPhone: String(row.tenant_phone ?? ""),
    tenantEmail: String(row.tenant_email ?? ""),
    monthlyRent: num(row.monthly_rent),
    rentDueDay: Math.round(num(row.rent_due_day)) || 1,
    leaseStartDate: dateStr(row.lease_start_date),
    leaseEndDate: dateStr(row.lease_end_date),
    securityDeposit: num(row.security_deposit),
    status: row.status as PropertyStatus,
    notes: String(row.notes ?? ""),
    soldDate: dateStr(row.sold_date),
    salePrice: sp === null || sp === undefined ? null : num(sp),
    buyerName: String(row.buyer_name ?? ""),
    saleNotes: String(row.sale_notes ?? ""),
    nextReminderDate: dateStr(row.next_reminder_date),
    reminderNote: String(row.reminder_note ?? ""),
    reminderCompleted: Boolean(row.reminder_completed),
    reminderCompletedAt: String(row.reminder_completed_at ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function mapPropTxn(row: Record<string, unknown>): PropertyTransaction {
  return {
    id: String(row.id),
    propertyId: String(row.property_id),
    date: dateStr(row.txn_date),
    type: row.type as TransactionType,
    description: String(row.description ?? ""),
    chargeAmount: num(row.charge_amount),
    paymentAmount: num(row.payment_amount),
    paymentMethod: normalizePaymentMethod(String(row.payment_method ?? "")),
    checkNumber: String(row.check_number ?? ""),
    referenceNumber: String(row.reference_number ?? ""),
    applyTo: (row.apply_to || "Rent") as ApplyTo,
    notes: String(row.notes ?? ""),
    createdAt: String(row.created_at ?? ""),
  };
}

function mapLoan(row: Record<string, unknown>): Loan {
  return {
    id: String(row.id),
    borrowerName: String(row.borrower_name ?? ""),
    borrowerPhone: String(row.borrower_phone ?? ""),
    borrowerEmail: String(row.borrower_email ?? ""),
    relationship: String(row.relationship ?? ""),
    originalAmount: num(row.original_amount),
    loanDate: dateStr(row.loan_date),
    interestRate: num(row.interest_rate),
    paymentDueDate: String(row.payment_due_date ?? ""),
    expectedMonthlyPayment: num(row.expected_monthly_payment),
    status: row.status as LoanStatus,
    notes: String(row.notes ?? ""),
    nextReminderDate: dateStr(row.next_reminder_date),
    reminderNote: String(row.reminder_note ?? ""),
    reminderCompleted: Boolean(row.reminder_completed),
    reminderCompletedAt: String(row.reminder_completed_at ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function mapLoanTxn(row: Record<string, unknown>): LoanTransaction {
  return {
    id: String(row.id),
    loanId: String(row.loan_id),
    date: dateStr(row.txn_date),
    type: row.type as LoanTransactionType,
    description: String(row.description ?? ""),
    chargeAmount: num(row.charge_amount),
    paymentAmount: num(row.payment_amount),
    paymentMethod: normalizePaymentMethod(String(row.payment_method ?? "")),
    checkNumber: String(row.check_number ?? ""),
    referenceNumber: String(row.reference_number ?? ""),
    notes: String(row.notes ?? ""),
    createdAt: String(row.created_at ?? ""),
  };
}

function mapNote(row: Record<string, unknown>): Note {
  return {
    id: String(row.id),
    relatedType: row.related_type as Note["relatedType"],
    relatedId: String(row.related_id ?? ""),
    noteDate: dateStr(row.note_date),
    noteText: String(row.note_text ?? ""),
    reminderDate: row.reminder_date ? dateStr(row.reminder_date) : "",
    createdAt: String(row.created_at ?? ""),
  };
}

function mapDocument(row: Record<string, unknown>): Document {
  const templateBody = row.template_body != null ? String(row.template_body) : "";
  const storagePath = row.storage_path != null ? String(row.storage_path) : null;
  return {
    id: String(row.id),
    documentName: String(row.document_name ?? ""),
    documentType: row.document_type as DocumentType,
    relatedType: row.related_type as Document["relatedType"],
    relatedId: String(row.related_id ?? ""),
    fileUri: templateBody,
    notes: String(row.notes ?? ""),
    uploadedAt: String(row.uploaded_at ?? ""),
    storagePath,
    originalFileName: row.file_name != null ? String(row.file_name) : null,
    mimeType: row.mime_type != null ? String(row.mime_type) : null,
    sizeBytes: row.size_bytes != null ? Number(row.size_bytes) : null,
    propertyTransactionId:
      row.property_transaction_id != null ? String(row.property_transaction_id) : null,
    loanTransactionId:
      row.loan_transaction_id != null ? String(row.loan_transaction_id) : null,
  };
}

function mapActivity(row: Record<string, unknown>): ActivityItem {
  return {
    id: String(row.id),
    date: dateStr(row.activity_date),
    type: row.type as ActivityItem["type"],
    entityType: row.entity_type as ActivityItem["entityType"],
    entityId: String(row.entity_id ?? ""),
    entityName: String(row.entity_name ?? ""),
    personName: String(row.person_name ?? ""),
    amount: num(row.amount),
    description: String(row.description ?? ""),
  };
}

async function trimActivities(userId: string): Promise<void> {
  const { count, error: cErr } = await supabase
    .from(T.ACTIVITIES)
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if (cErr || count === null || count <= 200) return;
  const excess = count - 200;
  const { data: oldest, error: oErr } = await supabase
    .from(T.ACTIVITIES)
    .select("id")
    .eq("user_id", userId)
    .order("activity_date", { ascending: true })
    .order("id", { ascending: true })
    .limit(excess);
  if (oErr || !oldest?.length) return;
  await supabase
    .from(T.ACTIVITIES)
    .delete()
    .in(
      "id",
      oldest.map((r) => r.id as string)
    );
}

async function addActivity(
  userId: string,
  data: Omit<ActivityItem, "id">
): Promise<void> {
  const { error } = await supabase.from(T.ACTIVITIES).insert({
    user_id: userId,
    activity_date: data.date,
    type: data.type,
    entity_type: data.entityType,
    entity_id: data.entityId,
    entity_name: data.entityName,
    person_name: data.personName,
    amount: data.amount,
    description: data.description,
  });
  if (error) throw new Error(error.message);
  await trimActivities(userId);
}

// ============ LEDGER SETTINGS (barbara_settings) ============

export async function getLedgerDisplayName(): Promise<string> {
  const user = await requireUser();
  const { data, error } = await supabase
    .from(T.SETTINGS)
    .select("ledger_display_name")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return String(data?.ledger_display_name ?? "").trim();
}

export async function saveLedgerDisplayName(displayName: string): Promise<void> {
  const user = await requireUser();
  const trimmed = displayName.trim();
  const { error } = await supabase.from(T.SETTINGS).upsert(
    { user_id: user.id, ledger_display_name: trimmed },
    { onConflict: "user_id" }
  );
  if (error) throw new Error(error.message);
}

export type ReminderListItem = {
  date: string;
  note: string;
  entityType: "property" | "loan";
  entityId: string;
  entityLabel: string;
};

/** Reminders with a date on or after today (local date string). */
export async function getUpcomingReminders(): Promise<ReminderListItem[]> {
  const today = todayStr();
  const [properties, loans] = await Promise.all([getProperties(), getLoans()]);
  const items: ReminderListItem[] = [];
  for (const p of properties) {
    const d = p.nextReminderDate?.trim();
    if (d && d >= today && !p.reminderCompleted) {
      items.push({
        date: d,
        note: p.reminderNote.trim(),
        entityType: "property",
        entityId: p.id,
        entityLabel: p.propertyName,
      });
    }
  }
  for (const l of loans) {
    const d = l.nextReminderDate?.trim();
    if (d && d >= today && !l.reminderCompleted) {
      items.push({
        date: d,
        note: l.reminderNote.trim(),
        entityType: "loan",
        entityId: l.id,
        entityLabel: `Loan to ${l.borrowerName}`,
      });
    }
  }
  items.sort((a, b) => a.date.localeCompare(b.date) || a.entityLabel.localeCompare(b.entityLabel));
  return items;
}

// ============ PROPERTIES ============

export async function getProperties(): Promise<Property[]> {
  const user = await requireUser();
  const { data, error } = await supabase
    .from(T.PROPERTIES)
    .select("*")
    .eq("user_id", user.id)
    .order("property_name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapProperty(r as Record<string, unknown>));
}

export async function getProperty(id: string): Promise<Property | undefined> {
  const user = await requireUser();
  const { data, error } = await supabase
    .from(T.PROPERTIES)
    .select("*")
    .eq("user_id", user.id)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return undefined;
  return mapProperty(data as Record<string, unknown>);
}

export async function addProperty(
  data: Omit<Property, "id" | "createdAt" | "updatedAt">
): Promise<Property> {
  const user = await requireUser();
  const row = {
    user_id: user.id,
    property_name: data.propertyName,
    address: data.address,
    tenant_name: data.tenantName,
    tenant_contact: data.tenantContact,
    tenant_phone: data.tenantPhone,
    tenant_email: data.tenantEmail,
    monthly_rent: data.monthlyRent,
    rent_due_day: data.rentDueDay,
    lease_start_date: data.leaseStartDate || null,
    lease_end_date: data.leaseEndDate || null,
    security_deposit: data.securityDeposit,
    status: data.status,
    notes: data.notes,
    sold_date: data.soldDate || null,
    sale_price: data.salePrice,
    buyer_name: data.buyerName ?? "",
    sale_notes: data.saleNotes ?? "",
    next_reminder_date: data.nextReminderDate || null,
    reminder_note: data.reminderNote ?? "",
    reminder_completed: Boolean(data.reminderCompleted),
    reminder_completed_at: data.reminderCompletedAt || null,
  };
  const { data: inserted, error } = await supabase.from(T.PROPERTIES).insert(row).select("*").single();
  if (error) throw new Error(error.message);
  const p = mapProperty(inserted as Record<string, unknown>);
  if (data.monthlyRent > 0) {
    await addPropertyTransaction({
      propertyId: p.id,
      date: todayStr(),
      type: "charge",
      description: "Initial monthly rent charge",
      chargeAmount: data.monthlyRent,
      paymentAmount: 0,
      paymentMethod: "",
      checkNumber: "",
      referenceNumber: "",
      applyTo: "Rent",
      notes: "",
    });
  }
  const fresh = await getProperty(p.id);
  if (!fresh) throw new Error("Property was created but could not be loaded.");
  return fresh;
}

export async function updateProperty(id: string, data: Partial<Property>): Promise<void> {
  const user = await requireUser();
  const patch: Record<string, unknown> = {};
  if (data.propertyName !== undefined) patch.property_name = data.propertyName;
  if (data.address !== undefined) patch.address = data.address;
  if (data.tenantName !== undefined) patch.tenant_name = data.tenantName;
  if (data.tenantContact !== undefined) patch.tenant_contact = data.tenantContact;
  if (data.tenantPhone !== undefined) patch.tenant_phone = data.tenantPhone;
  if (data.tenantEmail !== undefined) patch.tenant_email = data.tenantEmail;
  if (data.monthlyRent !== undefined) patch.monthly_rent = data.monthlyRent;
  if (data.rentDueDay !== undefined) patch.rent_due_day = data.rentDueDay;
  if (data.leaseStartDate !== undefined) patch.lease_start_date = data.leaseStartDate || null;
  if (data.leaseEndDate !== undefined) patch.lease_end_date = data.leaseEndDate || null;
  if (data.securityDeposit !== undefined) patch.security_deposit = data.securityDeposit;
  if (data.status !== undefined) patch.status = data.status;
  if (data.notes !== undefined) patch.notes = data.notes;
  if (data.soldDate !== undefined) patch.sold_date = data.soldDate || null;
  if (data.salePrice !== undefined) patch.sale_price = data.salePrice;
  if (data.buyerName !== undefined) patch.buyer_name = data.buyerName;
  if (data.saleNotes !== undefined) patch.sale_notes = data.saleNotes;
  if (data.nextReminderDate !== undefined) patch.next_reminder_date = data.nextReminderDate || null;
  if (data.reminderNote !== undefined) patch.reminder_note = data.reminderNote;
  if (data.reminderCompleted !== undefined) patch.reminder_completed = data.reminderCompleted;
  if (data.reminderCompletedAt !== undefined)
    patch.reminder_completed_at = data.reminderCompletedAt || null;
  const { error } = await supabase
    .from(T.PROPERTIES)
    .update(patch)
    .eq("user_id", user.id)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function archiveProperty(id: string): Promise<void> {
  await updateProperty(id, { status: "Closed" });
}

export async function markPropertyReminderDone(id: string): Promise<void> {
  await updateProperty(id, {
    reminderCompleted: true,
    reminderCompletedAt: new Date().toISOString(),
  });
}

export async function markPropertySold(
  id: string,
  data: { soldDate: string; salePrice: number; buyerName?: string; saleNotes?: string }
): Promise<void> {
  await updateProperty(id, {
    status: "Sold",
    soldDate: data.soldDate,
    salePrice: data.salePrice,
    buyerName: (data.buyerName ?? "").trim(),
    saleNotes: (data.saleNotes ?? "").trim(),
  });
}

/** Removes property, cascaded transactions, related notes/documents/activities, and storage files. */
export async function deleteProperty(id: string): Promise<void> {
  const user = await requireUser();
  const docs = await getDocuments("property", id);
  const paths = docs.map((d) => d.storagePath).filter(Boolean) as string[];
  if (paths.length > 0) {
    const { error: se } = await supabase.storage.from(BARBARA_DOCUMENTS_BUCKET).remove(paths);
    if (se) throw new Error(se.message);
  }
  const { error: d1 } = await supabase
    .from(T.DOCUMENTS)
    .delete()
    .eq("user_id", user.id)
    .eq("related_type", "property")
    .eq("related_id", id);
  if (d1) throw new Error(d1.message);
  const { error: d2 } = await supabase
    .from(T.NOTES)
    .delete()
    .eq("user_id", user.id)
    .eq("related_type", "property")
    .eq("related_id", id);
  if (d2) throw new Error(d2.message);
  const { error: d3 } = await supabase
    .from(T.ACTIVITIES)
    .delete()
    .eq("user_id", user.id)
    .eq("entity_type", "property")
    .eq("entity_id", id);
  if (d3) throw new Error(d3.message);
  const { error: d4 } = await supabase.from(T.PROPERTIES).delete().eq("user_id", user.id).eq("id", id);
  if (d4) throw new Error(d4.message);
}

// ============ PROPERTY TRANSACTIONS ============

export async function getPropertyTransactions(propertyId: string): Promise<PropertyTransaction[]> {
  const user = await requireUser();
  const { data, error } = await supabase
    .from(T.PROP_TXN)
    .select("*")
    .eq("user_id", user.id)
    .eq("property_id", propertyId)
    .order("txn_date", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  const rows = (data ?? []).map((r) => mapPropTxn(r as Record<string, unknown>));
  return rows.sort(
    (a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)
  );
}

export async function getAllPropertyTransactions(): Promise<PropertyTransaction[]> {
  const user = await requireUser();
  const { data, error } = await supabase.from(T.PROP_TXN).select("*").eq("user_id", user.id);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapPropTxn(r as Record<string, unknown>));
}

export async function addPropertyTransaction(
  data: Omit<PropertyTransaction, "id" | "createdAt">
): Promise<PropertyTransaction> {
  const user = await requireUser();
  const row = {
    user_id: user.id,
    property_id: data.propertyId,
    txn_date: data.date,
    type: data.type,
    description: data.description,
    charge_amount: data.chargeAmount,
    payment_amount: data.paymentAmount,
    payment_method: data.paymentMethod,
    check_number: data.checkNumber,
    reference_number: data.referenceNumber,
    apply_to: data.applyTo,
    notes: data.notes,
  };
  const { data: inserted, error } = await supabase.from(T.PROP_TXN).insert(row).select("*").single();
  if (error) throw new Error(error.message);
  const txn = mapPropTxn(inserted as Record<string, unknown>);
  const property = await getProperty(data.propertyId);
  if (property) {
    const actType =
      data.type === "payment" ? "payment" : data.type === "late_fee" ? "late_fee" : "charge";
    await addActivity(user.id, {
      date: data.date,
      type: actType,
      entityType: "property",
      entityId: data.propertyId,
      entityName: property.propertyName,
      personName: property.tenantName,
      amount:
        data.type === "payment" ? data.paymentAmount : data.chargeAmount,
      description: data.description || data.type,
    });
  }
  return txn;
}

export function calculatePropertyBalance(transactions: PropertyTransaction[]): number {
  let b = 0;
  for (const t of transactions) b += t.chargeAmount - t.paymentAmount;
  return Math.max(0, b);
}

export function getRunningBalanceTable(transactions: PropertyTransaction[]) {
  let b = 0;
  return transactions.map((t) => {
    b += t.chargeAmount - t.paymentAmount;
    return { ...t, runningBalance: b };
  });
}

// ============ LOANS ============

export async function getLoans(): Promise<Loan[]> {
  const user = await requireUser();
  const { data, error } = await supabase
    .from(T.LOANS)
    .select("*")
    .eq("user_id", user.id)
    .order("borrower_name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapLoan(r as Record<string, unknown>));
}

export async function getLoan(id: string): Promise<Loan | undefined> {
  const user = await requireUser();
  const { data, error } = await supabase
    .from(T.LOANS)
    .select("*")
    .eq("user_id", user.id)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return undefined;
  return mapLoan(data as Record<string, unknown>);
}

export async function addLoan(data: Omit<Loan, "id" | "createdAt" | "updatedAt">): Promise<Loan> {
  const user = await requireUser();
  const row = {
    user_id: user.id,
    borrower_name: data.borrowerName,
    borrower_phone: data.borrowerPhone,
    borrower_email: data.borrowerEmail,
    relationship: data.relationship,
    original_amount: data.originalAmount,
    loan_date: data.loanDate || null,
    interest_rate: data.interestRate,
    payment_due_date: data.paymentDueDate,
    expected_monthly_payment: data.expectedMonthlyPayment,
    status: data.status,
    notes: data.notes,
    next_reminder_date: data.nextReminderDate || null,
    reminder_note: data.reminderNote ?? "",
    reminder_completed: Boolean(data.reminderCompleted),
    reminder_completed_at: data.reminderCompletedAt || null,
  };
  const { data: inserted, error } = await supabase.from(T.LOANS).insert(row).select("*").single();
  if (error) throw new Error(error.message);
  const loan = mapLoan(inserted as Record<string, unknown>);
  if (data.originalAmount > 0) {
    await addLoanTransaction({
      loanId: loan.id,
      date: data.loanDate || todayStr(),
      type: "charge",
      description: "Original loan amount",
      chargeAmount: data.originalAmount,
      paymentAmount: 0,
      paymentMethod: "",
      checkNumber: "",
      referenceNumber: "",
      notes: "",
    });
  }
  const fresh = await getLoan(loan.id);
  if (!fresh) throw new Error("Loan was created but could not be loaded.");
  return fresh;
}

export async function updateLoan(id: string, data: Partial<Loan>): Promise<void> {
  const user = await requireUser();
  const patch: Record<string, unknown> = {};
  if (data.borrowerName !== undefined) patch.borrower_name = data.borrowerName;
  if (data.borrowerPhone !== undefined) patch.borrower_phone = data.borrowerPhone;
  if (data.borrowerEmail !== undefined) patch.borrower_email = data.borrowerEmail;
  if (data.relationship !== undefined) patch.relationship = data.relationship;
  if (data.originalAmount !== undefined) patch.original_amount = data.originalAmount;
  if (data.loanDate !== undefined) patch.loan_date = data.loanDate || null;
  if (data.interestRate !== undefined) patch.interest_rate = data.interestRate;
  if (data.paymentDueDate !== undefined) patch.payment_due_date = data.paymentDueDate;
  if (data.expectedMonthlyPayment !== undefined)
    patch.expected_monthly_payment = data.expectedMonthlyPayment;
  if (data.status !== undefined) patch.status = data.status;
  if (data.notes !== undefined) patch.notes = data.notes;
  if (data.nextReminderDate !== undefined) patch.next_reminder_date = data.nextReminderDate || null;
  if (data.reminderNote !== undefined) patch.reminder_note = data.reminderNote;
  if (data.reminderCompleted !== undefined) patch.reminder_completed = data.reminderCompleted;
  if (data.reminderCompletedAt !== undefined)
    patch.reminder_completed_at = data.reminderCompletedAt || null;
  const { error } = await supabase.from(T.LOANS).update(patch).eq("user_id", user.id).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function archiveLoan(id: string): Promise<void> {
  await updateLoan(id, { status: "Written Off" });
}

export async function markLoanReminderDone(id: string): Promise<void> {
  await updateLoan(id, {
    reminderCompleted: true,
    reminderCompletedAt: new Date().toISOString(),
  });
}

// ============ LOAN TRANSACTIONS ============

export async function getLoanTransactions(loanId: string): Promise<LoanTransaction[]> {
  const user = await requireUser();
  const { data, error } = await supabase
    .from(T.LOAN_TXN)
    .select("*")
    .eq("user_id", user.id)
    .eq("loan_id", loanId)
    .order("txn_date", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  const rows = (data ?? []).map((r) => mapLoanTxn(r as Record<string, unknown>));
  return rows.sort(
    (a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)
  );
}

export async function getAllLoanTransactions(): Promise<LoanTransaction[]> {
  const user = await requireUser();
  const { data, error } = await supabase.from(T.LOAN_TXN).select("*").eq("user_id", user.id);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapLoanTxn(r as Record<string, unknown>));
}

export async function addLoanTransaction(
  data: Omit<LoanTransaction, "id" | "createdAt">
): Promise<LoanTransaction> {
  const user = await requireUser();
  const row = {
    user_id: user.id,
    loan_id: data.loanId,
    txn_date: data.date,
    type: data.type,
    description: data.description,
    charge_amount: data.chargeAmount,
    payment_amount: data.paymentAmount,
    payment_method: data.paymentMethod,
    check_number: data.checkNumber,
    reference_number: data.referenceNumber,
    notes: data.notes,
  };
  const { data: inserted, error } = await supabase.from(T.LOAN_TXN).insert(row).select("*").single();
  if (error) throw new Error(error.message);
  const txn = mapLoanTxn(inserted as Record<string, unknown>);
  const loan = await getLoan(data.loanId);
  if (loan) {
    const actType = data.type === "payment" ? "payment" : "charge";
    await addActivity(user.id, {
      date: data.date,
      type: actType,
      entityType: "loan",
      entityId: data.loanId,
      entityName: `Loan to ${loan.borrowerName}`,
      personName: loan.borrowerName,
      amount: data.type === "payment" ? data.paymentAmount : data.chargeAmount,
      description: data.description || data.type,
    });
  }
  return txn;
}

export function calculateLoanBalance(transactions: LoanTransaction[]): number {
  let b = 0;
  for (const t of transactions) b += t.chargeAmount - t.paymentAmount;
  return Math.max(0, b);
}

export function getLoanRunningBalanceTable(transactions: LoanTransaction[]) {
  let b = 0;
  return transactions.map((t) => {
    b += t.chargeAmount - t.paymentAmount;
    return { ...t, runningBalance: b };
  });
}

// ============ NOTES ============

export async function getNotes(
  relatedType: "property" | "loan" | "general",
  relatedId: string
): Promise<Note[]> {
  const user = await requireUser();
  let q = supabase.from(T.NOTES).select("*").eq("user_id", user.id);
  if (relatedType === "general") {
    q = q.eq("related_type", "general");
  } else {
    q = q.eq("related_type", relatedType).eq("related_id", relatedId);
  }
  const { data, error } = await q.order("note_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapNote(r as Record<string, unknown>));
}

export async function getAllNotes(): Promise<Note[]> {
  const user = await requireUser();
  const { data, error } = await supabase.from(T.NOTES).select("*").eq("user_id", user.id);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapNote(r as Record<string, unknown>));
}

export async function addNote(data: Omit<Note, "id" | "createdAt">): Promise<Note> {
  const user = await requireUser();
  const row = {
    user_id: user.id,
    related_type: data.relatedType,
    related_id: data.relatedId,
    note_date: data.noteDate,
    note_text: data.noteText,
    reminder_date: data.reminderDate || null,
  };
  const { data: inserted, error } = await supabase.from(T.NOTES).insert(row).select("*").single();
  if (error) throw new Error(error.message);
  const note = mapNote(inserted as Record<string, unknown>);
  let entityName = "";
  let personName = "";
  if (data.relatedType === "property") {
    const p = await getProperty(data.relatedId);
    if (p) {
      entityName = p.propertyName;
      personName = p.tenantName;
    }
  } else if (data.relatedType === "loan") {
    const l = await getLoan(data.relatedId);
    if (l) {
      entityName = `Loan to ${l.borrowerName}`;
      personName = l.borrowerName;
    }
  } else entityName = "General Note";
  await addActivity(user.id, {
    date: data.noteDate,
    type: "note",
    entityType: data.relatedType === "general" ? "property" : data.relatedType,
    entityId: data.relatedId,
    entityName,
    personName,
    amount: 0,
    description: data.noteText.substring(0, 100),
  });
  return note;
}

// ============ DOCUMENTS ============

export async function getDocuments(relatedType?: string, relatedId?: string): Promise<Document[]> {
  const user = await requireUser();
  let q = supabase.from(T.DOCUMENTS).select("*").eq("user_id", user.id);
  if (relatedType && relatedId !== undefined)
    q = q.eq("related_type", relatedType).eq("related_id", relatedId);
  else if (relatedType) q = q.eq("related_type", relatedType);
  const { data, error } = await q.order("uploaded_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapDocument(r as Record<string, unknown>));
}

export async function addDocument(
  data: Omit<Document, "id" | "uploadedAt"> & { id?: string }
): Promise<Document> {
  const user = await requireUser();
  const row: Record<string, unknown> = {
    user_id: user.id,
    document_name: data.documentName,
    document_type: data.documentType,
    related_type: data.relatedType,
    related_id: data.relatedId,
    storage_path: data.storagePath ?? null,
    file_name: data.originalFileName ?? null,
    mime_type: data.mimeType ?? null,
    size_bytes: data.sizeBytes ?? null,
    template_body: data.relatedType === "template" ? data.fileUri || null : null,
    notes: data.notes,
    property_transaction_id: data.propertyTransactionId ?? null,
    loan_transaction_id: data.loanTransactionId ?? null,
  };
  if (data.id) row.id = data.id;
  const { data: inserted, error } = await supabase.from(T.DOCUMENTS).insert(row).select("*").single();
  if (error) throw new Error(error.message);
  const doc = mapDocument(inserted as Record<string, unknown>);
  if (data.relatedType !== "template") {
    let entityName = "";
    let personName = "";
    if (data.relatedType === "property" && data.relatedId) {
      const p = await getProperty(data.relatedId);
      if (p) {
        entityName = p.propertyName;
        personName = p.tenantName;
      }
    } else if (data.relatedType === "loan" && data.relatedId) {
      const l = await getLoan(data.relatedId);
      if (l) {
        entityName = `Loan to ${l.borrowerName}`;
        personName = l.borrowerName;
      }
    }
    await addActivity(user.id, {
      date: todayStr(),
      type: "document",
      entityType:
        data.relatedType === "property" || data.relatedType === "loan" ? data.relatedType : "property",
      entityId: data.relatedId || "",
      entityName: entityName || "General",
      personName,
      amount: 0,
      description: `Uploaded: ${data.documentName}`,
    });
  }
  return doc;
}

/** Upload a file to private bucket barbara-documents and insert barbara_documents row. */
export async function addDocumentWithFile(
  file: File,
  meta: {
    documentName: string;
    documentType: DocumentType;
    relatedType: Document["relatedType"];
    relatedId: string;
    notes: string;
    propertyTransactionId?: string | null;
    loanTransactionId?: string | null;
  }
): Promise<Document> {
  const user = await requireUser();
  let mime = file.type.toLowerCase().split(";")[0].trim();
  if (!mime && /\.(heic|heif)$/i.test(file.name)) mime = "image/heic";
  if (!mime && /\.webp$/i.test(file.name)) mime = "image/webp";
  if (!isAllowedDocumentMime(mime)) {
    throw new Error(
      "This file type is not supported. Use PDF, Word, JPG, PNG, HEIC, or WEBP."
    );
  }
  const docId = crypto.randomUUID();
  const path = `${user.id}/${docId}/${safeUploadFileName(file.name)}`;
  const { error: upErr } = await supabase.storage
    .from(BARBARA_DOCUMENTS_BUCKET)
    .upload(path, file, { contentType: mime || "application/octet-stream", upsert: false });
  if (upErr) throw new Error(upErr.message);
  return addDocument({
    id: docId,
    documentName: meta.documentName.trim(),
    documentType: meta.documentType,
    relatedType: meta.relatedType,
    relatedId: meta.relatedId,
    fileUri: "",
    notes: meta.notes.trim(),
    storagePath: path,
    originalFileName: file.name,
    mimeType: mime,
    sizeBytes: file.size,
    propertyTransactionId: meta.propertyTransactionId ?? null,
    loanTransactionId: meta.loanTransactionId ?? null,
  });
}

export async function getDocumentSignedUrl(
  storagePath: string,
  expiresSec = 3600
): Promise<string | null> {
  await requireUser();
  const { data, error } = await supabase.storage
    .from(BARBARA_DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, expiresSec);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

// ============ ACTIVITIES ============

export async function getActivities(limit = 20): Promise<ActivityItem[]> {
  const user = await requireUser();
  const { data, error } = await supabase
    .from(T.ACTIVITIES)
    .select("*")
    .eq("user_id", user.id)
    .order("activity_date", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  const rows = (data ?? []).map((r) => mapActivity(r as Record<string, unknown>));
  return rows.sort(
    (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)
  );
}

// ============ SEARCH ============

export async function searchAll(query: string) {
  const q = query.toLowerCase().trim();
  if (!q)
    return {
      properties: [] as Property[],
      loans: [] as Loan[],
      notes: [] as Note[],
      documents: [] as Document[],
      payments: [] as Array<{
        id: string;
        entityType: "property" | "loan";
        entityId: string;
        entityLabel: string;
        date: string;
        description: string;
        amount: number;
        checkNumber: string;
        referenceNumber: string;
      }>,
    };
  const allProperties = await getProperties();
  const properties = allProperties.filter((p) =>
    [p.propertyName, p.address, p.tenantName, p.tenantContact, p.notes].some((f) =>
      f?.toLowerCase().includes(q)
    )
  );
  const allLoans = await getLoans();
  const loans = allLoans.filter((l) =>
    [l.borrowerName, l.borrowerPhone, l.borrowerEmail, l.relationship, l.notes].some((f) =>
      f?.toLowerCase().includes(q)
    )
  );
  const notes = (await getAllNotes()).filter((n) => n.noteText?.toLowerCase().includes(q));
  const documents = (await getDocuments()).filter((d) =>
    [d.documentName, d.notes, d.documentType].some((f) => f?.toLowerCase().includes(q))
  );
  const [propTxns, loanTxns] = await Promise.all([getAllPropertyTransactions(), getAllLoanTransactions()]);
  const propertyNameById = new Map(allProperties.map((p) => [p.id, p.propertyName]));
  const loanNameById = new Map(allLoans.map((l) => [l.id, `Loan to ${l.borrowerName}`]));
  const propPaymentHits = propTxns
    .filter((t) =>
      [t.description, t.checkNumber, t.referenceNumber].some((f) => f?.toLowerCase().includes(q))
    )
    .map((t) => ({
      id: t.id,
      entityType: "property" as const,
      entityId: t.propertyId,
      entityLabel: propertyNameById.get(t.propertyId) || "Property",
      date: t.date,
      description: t.description,
      amount: t.paymentAmount > 0 ? t.paymentAmount : t.chargeAmount,
      checkNumber: t.checkNumber,
      referenceNumber: t.referenceNumber,
    }));
  const loanPaymentHits = loanTxns
    .filter((t) =>
      [t.description, t.checkNumber, t.referenceNumber].some((f) => f?.toLowerCase().includes(q))
    )
    .map((t) => ({
      id: t.id,
      entityType: "loan" as const,
      entityId: t.loanId,
      entityLabel: loanNameById.get(t.loanId) || "Loan",
      date: t.date,
      description: t.description,
      amount: t.paymentAmount > 0 ? t.paymentAmount : t.chargeAmount,
      checkNumber: t.checkNumber,
      referenceNumber: t.referenceNumber,
    }));
  const payments = [...propPaymentHits, ...loanPaymentHits].sort((a, b) => b.date.localeCompare(a.date));
  return { properties, loans, notes, documents, payments };
}

// ============ DASHBOARD STATS ============

export async function getDashboardStats(year?: number) {
  const targetYear = year || new Date().getFullYear();
  const yearStr = targetYear.toString();
  const propTxns = await getAllPropertyTransactions();
  const loanTxns = await getAllLoanTransactions();
  const properties = await getProperties();
  const loans = await getLoans();
  const yearPropTxns = propTxns.filter((t) => t.date.startsWith(yearStr));
  const yearLoanTxns = loanTxns.filter((t) => t.date.startsWith(yearStr));
  const totalRentalIncome = yearPropTxns
    .filter((t) => t.type === "payment")
    .reduce((s, t) => s + t.paymentAmount, 0);
  const totalLoanPayments = yearLoanTxns
    .filter((t) => t.type === "payment")
    .reduce((s, t) => s + t.paymentAmount, 0);
  const totalLateFees = yearPropTxns
    .filter((t) => t.type === "late_fee")
    .reduce((s, t) => s + t.chargeAmount, 0);
  let unpaidRent = 0;
  for (const p of properties.filter((p) => p.status === "Active" || p.status === "Past Due")) {
    unpaidRent += calculatePropertyBalance(propTxns.filter((t) => t.propertyId === p.id));
  }
  let openLoanBalances = 0;
  for (const l of loans.filter((l) => l.status === "Active" || l.status === "Past Due")) {
    openLoanBalances += calculateLoanBalance(loanTxns.filter((t) => t.loanId === l.id));
  }
  return { totalRentalIncome, totalLoanPayments, totalLateFees, unpaidRent, openLoanBalances };
}

// ============ TAX REPORTS ============

export interface PropertyTaxReport {
  property: Property;
  totalRentReceived: number;
  totalLateFees: number;
  totalOtherCharges: number;
  totalPayments: number;
  unpaidBalance: number;
  transactions: PropertyTransaction[];
}
export interface LoanTaxReport {
  loan: Loan;
  originalAmount: number;
  currentBalance: number;
  totalPayments: number;
  totalCharges: number;
  transactions: LoanTransaction[];
}

export async function generatePropertyTaxReport(year: number): Promise<PropertyTaxReport[]> {
  const yearStr = year.toString();
  const properties = await getProperties();
  const allTxns = await getAllPropertyTransactions();
  const reports: PropertyTaxReport[] = [];
  for (const property of properties) {
    const propTxns = allTxns.filter((t) => t.propertyId === property.id);
    const yearTxns = propTxns.filter((t) => t.date.startsWith(yearStr));
    if (yearTxns.length === 0 && property.status === "Closed") continue;
    const totalRentReceived = yearTxns
      .filter((t) => t.type === "payment" && t.applyTo === "Rent")
      .reduce((s, t) => s + t.paymentAmount, 0);
    const totalLateFees = yearTxns
      .filter((t) => t.type === "payment" && t.applyTo === "Late Fee")
      .reduce((s, t) => s + t.paymentAmount, 0);
    const totalOtherCharges = yearTxns
      .filter((t) => t.type === "payment" && t.applyTo === "Other Charge")
      .reduce((s, t) => s + t.paymentAmount, 0);
    const totalPayments = yearTxns
      .filter((t) => t.type === "payment")
      .reduce((s, t) => s + t.paymentAmount, 0);
    reports.push({
      property,
      totalRentReceived,
      totalLateFees,
      totalOtherCharges,
      totalPayments,
      unpaidBalance: calculatePropertyBalance(propTxns),
      transactions: yearTxns,
    });
  }
  return reports;
}

export async function generateLoanTaxReport(year: number): Promise<LoanTaxReport[]> {
  const yearStr = year.toString();
  const loans = await getLoans();
  const allTxns = await getAllLoanTransactions();
  const reports: LoanTaxReport[] = [];
  for (const loan of loans) {
    const loanTxns = allTxns.filter((t) => t.loanId === loan.id);
    const yearTxns = loanTxns.filter((t) => t.date.startsWith(yearStr));
    if (yearTxns.length === 0 && loan.status === "Written Off") continue;
    const totalPayments = yearTxns
      .filter((t) => t.type === "payment")
      .reduce((s, t) => s + t.paymentAmount, 0);
    const totalCharges = yearTxns
      .filter((t) => t.type === "charge")
      .reduce((s, t) => s + t.chargeAmount, 0);
    reports.push({
      loan,
      originalAmount: loan.originalAmount,
      currentBalance: calculateLoanBalance(loanTxns),
      totalPayments,
      totalCharges,
      transactions: yearTxns,
    });
  }
  return reports;
}

// ============ EXPORT / CLEAR ============

export async function exportAllData(): Promise<string> {
  const user = await requireUser();
  const [
    properties,
    propertyTransactions,
    loans,
    loanTransactions,
    notes,
    documents,
    activities,
  ] = await Promise.all([
    getProperties(),
    getAllPropertyTransactions(),
    getLoans(),
    getAllLoanTransactions(),
    getAllNotes(),
    getDocuments(),
    getActivities(1000),
  ]);
  const settingsRes = await supabase.from(T.SETTINGS).select("*").eq("user_id", user.id).maybeSingle();
  if (settingsRes.error) throw new Error(settingsRes.error.message);
  return JSON.stringify(
    {
      exportDate: new Date().toISOString(),
      ledgerSettings: settingsRes.data ?? null,
      properties,
      propertyTransactions,
      loans,
      loanTransactions,
      notes,
      documents,
      activities,
    },
    null,
    2
  );
}

export async function clearAllData(): Promise<void> {
  const user = await requireUser();
  const uid = user.id;

  const { data: docRows } = await supabase
    .from(T.DOCUMENTS)
    .select("storage_path")
    .eq("user_id", uid)
    .not("storage_path", "is", null);
  const paths = (docRows ?? [])
    .map((r) => r.storage_path as string)
    .filter(Boolean);
  if (paths.length > 0) {
    await supabase.storage.from(BARBARA_DOCUMENTS_BUCKET).remove(paths);
  }

  const { error: e0 } = await supabase.from(T.SETTINGS).delete().eq("user_id", uid);
  if (e0) throw new Error(e0.message);
  const { error: e1 } = await supabase.from(T.ACTIVITIES).delete().eq("user_id", uid);
  if (e1) throw new Error(e1.message);
  const { error: e2 } = await supabase.from(T.NOTES).delete().eq("user_id", uid);
  if (e2) throw new Error(e2.message);
  const { error: e3 } = await supabase.from(T.PROP_TXN).delete().eq("user_id", uid);
  if (e3) throw new Error(e3.message);
  const { error: e4 } = await supabase.from(T.LOAN_TXN).delete().eq("user_id", uid);
  if (e4) throw new Error(e4.message);
  const { error: e5 } = await supabase.from(T.DOCUMENTS).delete().eq("user_id", uid);
  if (e5) throw new Error(e5.message);
  const { error: e6 } = await supabase.from(T.PROPERTIES).delete().eq("user_id", uid);
  if (e6) throw new Error(e6.message);
  const { error: e7 } = await supabase.from(T.LOANS).delete().eq("user_id", uid);
  if (e7) throw new Error(e7.message);
}