import { useParams, useNavigate } from "react-router-dom";

const TEMPLATES: Record<string, { title: string; content: string }> = {
  "rental-agreement": {
    title: "Rental Agreement Template",
    content: `RESIDENTIAL RENTAL AGREEMENT

This Rental Agreement ("Agreement") is entered into on _____________ by and between:

LANDLORD: _____________________________________________
Address: ______________________________________________
Phone: _______________________________________________

TENANT: ______________________________________________
Address: ______________________________________________
Phone: _______________________________________________

PROPERTY ADDRESS: _____________________________________

1. TERM: This lease begins on _____________ and ends on _____________.

2. RENT: Tenant agrees to pay $__________ per month, due on the _____ day of each month.

3. SECURITY DEPOSIT: Tenant has deposited $__________ as a security deposit.

4. LATE FEE: A late fee of $__________ will be charged if rent is not received by the _____ day of the month.

5. UTILITIES: Tenant is responsible for the following utilities: ___________________________

6. MAINTENANCE: Tenant agrees to maintain the property in good condition and report any needed repairs promptly.

7. PETS: Pets are / are not allowed. If allowed, a pet deposit of $__________ is required.

8. TERMINATION: Either party may terminate this agreement with _____ days written notice.

9. GOVERNING LAW: This agreement is governed by the laws of the State of _____________.


LANDLORD SIGNATURE: _________________________ DATE: _____________

TENANT SIGNATURE: __________________________ DATE: _____________`,
  },
  "loan-agreement": {
    title: "Loan Agreement Template",
    content: `PERSONAL LOAN AGREEMENT

Date: _____________

LENDER: ______________________________________________
Address: ______________________________________________

BORROWER: ____________________________________________
Address: ______________________________________________

1. LOAN AMOUNT: The Lender agrees to loan the Borrower the sum of $__________.

2. INTEREST RATE: The loan shall bear interest at the rate of _____% per annum.

3. REPAYMENT TERMS: The Borrower agrees to repay the loan in monthly installments of $__________ beginning on _____________ and continuing until the loan is paid in full.

4. PAYMENT DUE DATE: Payments are due on the _____ day of each month.

5. LATE PAYMENT: If payment is not received within _____ days of the due date, a late fee of $__________ will be assessed.

6. PREPAYMENT: The Borrower may prepay this loan in whole or in part at any time without penalty.

7. DEFAULT: If the Borrower fails to make any payment when due, the entire remaining balance shall become immediately due and payable.

8. GOVERNING LAW: This agreement shall be governed by the laws of the State of _____________.


LENDER SIGNATURE: _________________________ DATE: _____________

BORROWER SIGNATURE: _______________________ DATE: _____________

WITNESS: __________________________________ DATE: _____________`,
  },
  "receipt": {
    title: "Payment Receipt Template",
    content: `PAYMENT RECEIPT

Receipt Number: _______________
Date: _____________

RECEIVED FROM: ______________________________________________

THE SUM OF: $__________

PAYMENT METHOD: Cash / Check #__________ / Bank Transfer / Other

FOR: ________________________________________________________

PROPERTY/LOAN: ______________________________________________

PERIOD COVERED: _____________ to _____________

BALANCE REMAINING: $__________


RECEIVED BY: _________________________ DATE: _____________

This receipt acknowledges payment as described above. Please retain for your records.`,
  },
};

export default function TemplateView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const template = TEMPLATES[id || ""];

  if (!template) return <div className="empty-state"><h3>Template not found</h3><button className="btn btn-primary" onClick={() => navigate("/documents")}>Back</button></div>;

  return (
    <div>
      <button className="back-link" onClick={() => navigate("/documents")}>← Back to Documents</button>
      <div className="page-header">
        <h2>{template.title}</h2>
        <button className="btn btn-primary" onClick={() => window.print()}>🖨️ Print</button>
      </div>
      <div className="card" style={{ whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: 15, lineHeight: 1.8 }}>
        {template.content}
      </div>
    </div>
  );
}
