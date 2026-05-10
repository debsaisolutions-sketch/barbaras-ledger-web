-- EasyLedger / Barbara app only: reminders, payment reference #, link documents to payment rows

ALTER TABLE public.barbara_properties
  ADD COLUMN IF NOT EXISTS next_reminder_date date,
  ADD COLUMN IF NOT EXISTS reminder_note text NOT NULL DEFAULT '';

ALTER TABLE public.barbara_loans
  ADD COLUMN IF NOT EXISTS next_reminder_date date,
  ADD COLUMN IF NOT EXISTS reminder_note text NOT NULL DEFAULT '';

ALTER TABLE public.barbara_property_transactions
  ADD COLUMN IF NOT EXISTS reference_number text NOT NULL DEFAULT '';

ALTER TABLE public.barbara_loan_transactions
  ADD COLUMN IF NOT EXISTS reference_number text NOT NULL DEFAULT '';

ALTER TABLE public.barbara_documents
  ADD COLUMN IF NOT EXISTS property_transaction_id uuid REFERENCES public.barbara_property_transactions (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS loan_transaction_id uuid REFERENCES public.barbara_loan_transactions (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS barbara_documents_prop_txn_idx ON public.barbara_documents (property_transaction_id)
  WHERE property_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS barbara_documents_loan_txn_idx ON public.barbara_documents (loan_transaction_id)
  WHERE loan_transaction_id IS NOT NULL;

COMMENT ON COLUMN public.barbara_documents.property_transaction_id IS 'Optional link to a property transaction (e.g. payment proof).';
COMMENT ON COLUMN public.barbara_documents.loan_transaction_id IS 'Optional link to a loan transaction (e.g. payment proof).';
