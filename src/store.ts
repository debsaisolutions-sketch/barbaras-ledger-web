// ============ TYPES ============

export type PropertyStatus = "Active" | "Vacant" | "Past Due" | "Closed";
export type LoanStatus = "Active" | "Paid Off" | "Past Due" | "Written Off";
export type PaymentMethod = "Cash" | "Check" | "Bank Transfer" | "Other";
export type TransactionType = "charge" | "payment" | "late_fee" | "adjustment";
export type LoanTransactionType = "charge" | "payment" | "adjustment";
export type DocumentType = "Rental Agreement" | "Lease" | "Loan Agreement" | "Receipt" | "Tax Document" | "Other" | "Template";
export type ApplyTo = "Rent" | "Late Fee" | "Other Charge";

export interface Property {
  id: string; propertyName: string; address: string; tenantName: string;
  tenantContact: string; tenantPhone: string; tenantEmail: string;
  monthlyRent: number; rentDueDay: number; leaseStartDate: string;
  leaseEndDate: string; securityDeposit: number; status: PropertyStatus;
  notes: string; createdAt: string; updatedAt: string;
}

export interface PropertyTransaction {
  id: string; propertyId: string; date: string; type: TransactionType;
  description: string; chargeAmount: number; paymentAmount: number;
  paymentMethod: PaymentMethod | ""; checkNumber: string; applyTo: ApplyTo;
  notes: string; createdAt: string;
}

export interface Loan {
  id: string; borrowerName: string; borrowerPhone: string; borrowerEmail: string;
  relationship: string; originalAmount: number; loanDate: string;
  interestRate: number; paymentDueDate: string; expectedMonthlyPayment: number;
  status: LoanStatus; notes: string; createdAt: string; updatedAt: string;
}

export interface LoanTransaction {
  id: string; loanId: string; date: string; type: LoanTransactionType;
  description: string; chargeAmount: number; paymentAmount: number;
  paymentMethod: PaymentMethod | ""; checkNumber: string; notes: string;
  createdAt: string;
}

export interface Note {
  id: string; relatedType: "property" | "loan" | "general"; relatedId: string;
  noteDate: string; noteText: string; reminderDate: string; createdAt: string;
}

export interface Document {
  id: string; documentName: string; documentType: DocumentType;
  relatedType: "property" | "loan" | "general" | "template"; relatedId: string;
  fileUri: string; notes: string; uploadedAt: string;
}

export interface ActivityItem {
  id: string; date: string; type: "payment" | "note" | "late_fee" | "document" | "charge";
  entityType: "property" | "loan"; entityId: string; entityName: string;
  personName: string; amount: number; description: string;
}

// ============ STORAGE KEYS ============
const KEYS = {
  PROPERTIES: "bl_properties", PROPERTY_TRANSACTIONS: "bl_prop_txns",
  LOANS: "bl_loans", LOAN_TRANSACTIONS: "bl_loan_txns",
  NOTES: "bl_notes", DOCUMENTS: "bl_documents", ACTIVITIES: "bl_activities",
};

// ============ HELPERS ============
function genId(): string { return Date.now().toString(36) + Math.random().toString(36).substr(2, 9); }
function todayStr(): string { return new Date().toISOString().split("T")[0]; }
function getList<T>(key: string): T[] {
  try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : []; } catch { return []; }
}
function setList<T>(key: string, list: T[]) { localStorage.setItem(key, JSON.stringify(list)); }

// ============ PROPERTIES ============
export function getProperties(): Property[] { return getList<Property>(KEYS.PROPERTIES); }
export function getProperty(id: string): Property | undefined { return getProperties().find(p => p.id === id); }

export function addProperty(data: Omit<Property, "id" | "createdAt" | "updatedAt">): Property {
  const list = getProperties();
  const now = new Date().toISOString();
  const p: Property = { ...data, id: genId(), createdAt: now, updatedAt: now };
  list.push(p); setList(KEYS.PROPERTIES, list);
  if (data.monthlyRent > 0) {
    addPropertyTransaction({ propertyId: p.id, date: todayStr(), type: "charge",
      description: "Initial monthly rent charge", chargeAmount: data.monthlyRent,
      paymentAmount: 0, paymentMethod: "", checkNumber: "", applyTo: "Rent", notes: "" });
  }
  return p;
}

export function updateProperty(id: string, data: Partial<Property>) {
  const list = getProperties(); const idx = list.findIndex(p => p.id === id);
  if (idx >= 0) { list[idx] = { ...list[idx], ...data, updatedAt: new Date().toISOString() }; setList(KEYS.PROPERTIES, list); }
}

export function archiveProperty(id: string) { updateProperty(id, { status: "Closed" }); }

// ============ PROPERTY TRANSACTIONS ============
export function getPropertyTransactions(propertyId: string): PropertyTransaction[] {
  return getList<PropertyTransaction>(KEYS.PROPERTY_TRANSACTIONS)
    .filter(t => t.propertyId === propertyId)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
}
export function getAllPropertyTransactions(): PropertyTransaction[] { return getList<PropertyTransaction>(KEYS.PROPERTY_TRANSACTIONS); }

export function addPropertyTransaction(data: Omit<PropertyTransaction, "id" | "createdAt">): PropertyTransaction {
  const list = getList<PropertyTransaction>(KEYS.PROPERTY_TRANSACTIONS);
  const txn: PropertyTransaction = { ...data, id: genId(), createdAt: new Date().toISOString() };
  list.push(txn); setList(KEYS.PROPERTY_TRANSACTIONS, list);
  const property = getProperty(data.propertyId);
  if (property) {
    const actType = data.type === "payment" ? "payment" : data.type === "late_fee" ? "late_fee" : "charge";
    addActivity({ date: data.date, type: actType, entityType: "property", entityId: data.propertyId,
      entityName: property.propertyName, personName: property.tenantName,
      amount: data.type === "payment" ? data.paymentAmount : data.chargeAmount, description: data.description || data.type });
  }
  return txn;
}

export function calculatePropertyBalance(transactions: PropertyTransaction[]): number {
  let b = 0; for (const t of transactions) b += t.chargeAmount - t.paymentAmount; return Math.max(0, b);
}
export function getRunningBalanceTable(transactions: PropertyTransaction[]) {
  let b = 0; return transactions.map(t => { b += t.chargeAmount - t.paymentAmount; return { ...t, runningBalance: b }; });
}

// ============ LOANS ============
export function getLoans(): Loan[] { return getList<Loan>(KEYS.LOANS); }
export function getLoan(id: string): Loan | undefined { return getLoans().find(l => l.id === id); }

export function addLoan(data: Omit<Loan, "id" | "createdAt" | "updatedAt">): Loan {
  const list = getLoans(); const now = new Date().toISOString();
  const loan: Loan = { ...data, id: genId(), createdAt: now, updatedAt: now };
  list.push(loan); setList(KEYS.LOANS, list);
  if (data.originalAmount > 0) {
    addLoanTransaction({ loanId: loan.id, date: data.loanDate || todayStr(), type: "charge",
      description: "Original loan amount", chargeAmount: data.originalAmount,
      paymentAmount: 0, paymentMethod: "", checkNumber: "", notes: "" });
  }
  return loan;
}

export function updateLoan(id: string, data: Partial<Loan>) {
  const list = getLoans(); const idx = list.findIndex(l => l.id === id);
  if (idx >= 0) { list[idx] = { ...list[idx], ...data, updatedAt: new Date().toISOString() }; setList(KEYS.LOANS, list); }
}
export function archiveLoan(id: string) { updateLoan(id, { status: "Written Off" }); }

// ============ LOAN TRANSACTIONS ============
export function getLoanTransactions(loanId: string): LoanTransaction[] {
  return getList<LoanTransaction>(KEYS.LOAN_TRANSACTIONS)
    .filter(t => t.loanId === loanId)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
}
export function getAllLoanTransactions(): LoanTransaction[] { return getList<LoanTransaction>(KEYS.LOAN_TRANSACTIONS); }

export function addLoanTransaction(data: Omit<LoanTransaction, "id" | "createdAt">): LoanTransaction {
  const list = getList<LoanTransaction>(KEYS.LOAN_TRANSACTIONS);
  const txn: LoanTransaction = { ...data, id: genId(), createdAt: new Date().toISOString() };
  list.push(txn); setList(KEYS.LOAN_TRANSACTIONS, list);
  const loan = getLoan(data.loanId);
  if (loan) {
    const actType = data.type === "payment" ? "payment" : "charge";
    addActivity({ date: data.date, type: actType, entityType: "loan", entityId: data.loanId,
      entityName: `Loan to ${loan.borrowerName}`, personName: loan.borrowerName,
      amount: data.type === "payment" ? data.paymentAmount : data.chargeAmount, description: data.description || data.type });
  }
  return txn;
}

export function calculateLoanBalance(transactions: LoanTransaction[]): number {
  let b = 0; for (const t of transactions) b += t.chargeAmount - t.paymentAmount; return Math.max(0, b);
}
export function getLoanRunningBalanceTable(transactions: LoanTransaction[]) {
  let b = 0; return transactions.map(t => { b += t.chargeAmount - t.paymentAmount; return { ...t, runningBalance: b }; });
}

// ============ NOTES ============
export function getNotes(relatedType: "property" | "loan" | "general", relatedId: string): Note[] {
  const list = getList<Note>(KEYS.NOTES);
  if (relatedType === "general") return list.filter(n => n.relatedType === "general").sort((a, b) => b.noteDate.localeCompare(a.noteDate));
  return list.filter(n => n.relatedType === relatedType && n.relatedId === relatedId).sort((a, b) => b.noteDate.localeCompare(a.noteDate));
}
export function getAllNotes(): Note[] { return getList<Note>(KEYS.NOTES); }

export function addNote(data: Omit<Note, "id" | "createdAt">): Note {
  const list = getList<Note>(KEYS.NOTES);
  const note: Note = { ...data, id: genId(), createdAt: new Date().toISOString() };
  list.push(note); setList(KEYS.NOTES, list);
  let entityName = ""; let personName = "";
  if (data.relatedType === "property") { const p = getProperty(data.relatedId); if (p) { entityName = p.propertyName; personName = p.tenantName; } }
  else if (data.relatedType === "loan") { const l = getLoan(data.relatedId); if (l) { entityName = `Loan to ${l.borrowerName}`; personName = l.borrowerName; } }
  else { entityName = "General Note"; }
  addActivity({ date: data.noteDate, type: "note", entityType: data.relatedType === "general" ? "property" : data.relatedType,
    entityId: data.relatedId, entityName, personName, amount: 0, description: data.noteText.substring(0, 100) });
  return note;
}

// ============ DOCUMENTS ============
export function getDocuments(relatedType?: string, relatedId?: string): Document[] {
  const list = getList<Document>(KEYS.DOCUMENTS);
  if (relatedType && relatedId) return list.filter(d => d.relatedType === relatedType && d.relatedId === relatedId);
  if (relatedType) return list.filter(d => d.relatedType === relatedType);
  return list;
}

export function addDocument(data: Omit<Document, "id" | "uploadedAt">): Document {
  const list = getList<Document>(KEYS.DOCUMENTS);
  const doc: Document = { ...data, id: genId(), uploadedAt: new Date().toISOString() };
  list.push(doc); setList(KEYS.DOCUMENTS, list);
  if (data.relatedType !== "template") {
    let entityName = ""; let personName = "";
    if (data.relatedType === "property" && data.relatedId) { const p = getProperty(data.relatedId); if (p) { entityName = p.propertyName; personName = p.tenantName; } }
    else if (data.relatedType === "loan" && data.relatedId) { const l = getLoan(data.relatedId); if (l) { entityName = `Loan to ${l.borrowerName}`; personName = l.borrowerName; } }
    addActivity({ date: todayStr(), type: "document", entityType: (data.relatedType === "property" || data.relatedType === "loan") ? data.relatedType : "property",
      entityId: data.relatedId || "", entityName: entityName || "General", personName, amount: 0, description: `Uploaded: ${data.documentName}` });
  }
  return doc;
}

// ============ ACTIVITIES ============
export function getActivities(limit = 20): ActivityItem[] {
  return getList<ActivityItem>(KEYS.ACTIVITIES).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, limit);
}
function addActivity(data: Omit<ActivityItem, "id">) {
  const list = getList<ActivityItem>(KEYS.ACTIVITIES);
  list.push({ ...data, id: genId() });
  if (list.length > 200) list.splice(0, list.length - 200);
  setList(KEYS.ACTIVITIES, list);
}

// ============ SEARCH ============
export function searchAll(query: string) {
  const q = query.toLowerCase().trim();
  if (!q) return { properties: [] as Property[], loans: [] as Loan[], notes: [] as Note[], documents: [] as Document[] };
  const properties = getProperties().filter(p => [p.propertyName, p.address, p.tenantName, p.tenantContact, p.notes].some(f => f?.toLowerCase().includes(q)));
  const loans = getLoans().filter(l => [l.borrowerName, l.borrowerPhone, l.borrowerEmail, l.relationship, l.notes].some(f => f?.toLowerCase().includes(q)));
  const notes = getAllNotes().filter(n => n.noteText?.toLowerCase().includes(q));
  const documents = getDocuments().filter(d => [d.documentName, d.notes, d.documentType].some(f => f?.toLowerCase().includes(q)));
  return { properties, loans, notes, documents };
}

// ============ DASHBOARD STATS ============
export function getDashboardStats(year?: number) {
  const targetYear = year || new Date().getFullYear(); const yearStr = targetYear.toString();
  const propTxns = getAllPropertyTransactions(); const loanTxns = getAllLoanTransactions();
  const properties = getProperties(); const loans = getLoans();
  const yearPropTxns = propTxns.filter(t => t.date.startsWith(yearStr));
  const yearLoanTxns = loanTxns.filter(t => t.date.startsWith(yearStr));
  const totalRentalIncome = yearPropTxns.filter(t => t.type === "payment").reduce((s, t) => s + t.paymentAmount, 0);
  const totalLoanPayments = yearLoanTxns.filter(t => t.type === "payment").reduce((s, t) => s + t.paymentAmount, 0);
  const totalLateFees = yearPropTxns.filter(t => t.type === "late_fee").reduce((s, t) => s + t.chargeAmount, 0);
  let unpaidRent = 0;
  for (const p of properties.filter(p => p.status === "Active" || p.status === "Past Due")) {
    unpaidRent += calculatePropertyBalance(propTxns.filter(t => t.propertyId === p.id));
  }
  let openLoanBalances = 0;
  for (const l of loans.filter(l => l.status === "Active" || l.status === "Past Due")) {
    openLoanBalances += calculateLoanBalance(loanTxns.filter(t => t.loanId === l.id));
  }
  return { totalRentalIncome, totalLoanPayments, totalLateFees, unpaidRent, openLoanBalances };
}

// ============ TAX REPORTS ============
export interface PropertyTaxReport { property: Property; totalRentReceived: number; totalLateFees: number; totalOtherCharges: number; totalPayments: number; unpaidBalance: number; transactions: PropertyTransaction[]; }
export interface LoanTaxReport { loan: Loan; originalAmount: number; currentBalance: number; totalPayments: number; totalCharges: number; transactions: LoanTransaction[]; }

export function generatePropertyTaxReport(year: number): PropertyTaxReport[] {
  const yearStr = year.toString(); const properties = getProperties(); const allTxns = getAllPropertyTransactions();
  const reports: PropertyTaxReport[] = [];
  for (const property of properties) {
    const propTxns = allTxns.filter(t => t.propertyId === property.id);
    const yearTxns = propTxns.filter(t => t.date.startsWith(yearStr));
    if (yearTxns.length === 0 && property.status === "Closed") continue;
    const totalRentReceived = yearTxns.filter(t => t.type === "payment" && t.applyTo === "Rent").reduce((s, t) => s + t.paymentAmount, 0);
    const totalLateFees = yearTxns.filter(t => t.type === "payment" && t.applyTo === "Late Fee").reduce((s, t) => s + t.paymentAmount, 0);
    const totalOtherCharges = yearTxns.filter(t => t.type === "payment" && t.applyTo === "Other Charge").reduce((s, t) => s + t.paymentAmount, 0);
    const totalPayments = yearTxns.filter(t => t.type === "payment").reduce((s, t) => s + t.paymentAmount, 0);
    reports.push({ property, totalRentReceived, totalLateFees, totalOtherCharges, totalPayments, unpaidBalance: calculatePropertyBalance(propTxns), transactions: yearTxns });
  }
  return reports;
}

export function generateLoanTaxReport(year: number): LoanTaxReport[] {
  const yearStr = year.toString(); const loans = getLoans(); const allTxns = getAllLoanTransactions();
  const reports: LoanTaxReport[] = [];
  for (const loan of loans) {
    const loanTxns = allTxns.filter(t => t.loanId === loan.id);
    const yearTxns = loanTxns.filter(t => t.date.startsWith(yearStr));
    if (yearTxns.length === 0 && loan.status === "Written Off") continue;
    const totalPayments = yearTxns.filter(t => t.type === "payment").reduce((s, t) => s + t.paymentAmount, 0);
    const totalCharges = yearTxns.filter(t => t.type === "charge").reduce((s, t) => s + t.chargeAmount, 0);
    reports.push({ loan, originalAmount: loan.originalAmount, currentBalance: calculateLoanBalance(loanTxns), totalPayments, totalCharges, transactions: yearTxns });
  }
  return reports;
}

// ============ EXPORT / CLEAR ============
export function exportAllData(): string {
  return JSON.stringify({
    exportDate: new Date().toISOString(), properties: getProperties(),
    propertyTransactions: getAllPropertyTransactions(), loans: getLoans(),
    loanTransactions: getAllLoanTransactions(), notes: getAllNotes(),
    documents: getDocuments(), activities: getActivities(1000),
  }, null, 2);
}

export function clearAllData() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
}
