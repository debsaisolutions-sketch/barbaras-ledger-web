-- ============================================================================
-- Barbara's Ledger — isolated schema objects (prefix: barbara_)
-- Does NOT alter, drop, or reference any existing Debt GPS tables, buckets,
-- functions, or policies. Only creates new barbara_* tables + barbara-documents.
-- ============================================================================

-- -----------------------------------------------------------------------------
-- Helper: keep updated_at current on row update
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.barbara_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.barbara_set_updated_at() IS 'Barbara Ledger: sets updated_at on UPDATE (Barbara tables only).';

-- -----------------------------------------------------------------------------
-- barbara_properties
-- -----------------------------------------------------------------------------
CREATE TABLE public.barbara_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  property_name text NOT NULL,
  address text NOT NULL DEFAULT '',
  tenant_name text NOT NULL DEFAULT '',
  tenant_contact text NOT NULL DEFAULT '',
  tenant_phone text NOT NULL DEFAULT '',
  tenant_email text NOT NULL DEFAULT '',
  monthly_rent numeric(14, 2) NOT NULL DEFAULT 0,
  rent_due_day integer NOT NULL DEFAULT 1,
  lease_start_date date,
  lease_end_date date,
  security_deposit numeric(14, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Active'
    CHECK (status IN ('Active', 'Vacant', 'Past Due', 'Closed')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX barbara_properties_user_id_idx ON public.barbara_properties (user_id);

CREATE TRIGGER barbara_properties_set_updated_at
  BEFORE UPDATE ON public.barbara_properties
  FOR EACH ROW
  EXECUTE FUNCTION public.barbara_set_updated_at();

COMMENT ON TABLE public.barbara_properties IS 'Barbara Ledger: rental properties (isolated from other apps).';

-- -----------------------------------------------------------------------------
-- barbara_property_transactions
-- -----------------------------------------------------------------------------
CREATE TABLE public.barbara_property_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.barbara_properties (id) ON DELETE CASCADE,
  txn_date date NOT NULL,
  type text NOT NULL
    CHECK (type IN ('charge', 'payment', 'late_fee', 'adjustment')),
  description text NOT NULL DEFAULT '',
  charge_amount numeric(14, 2) NOT NULL DEFAULT 0,
  payment_amount numeric(14, 2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT '',
  check_number text NOT NULL DEFAULT '',
  apply_to text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX barbara_property_transactions_user_id_idx ON public.barbara_property_transactions (user_id);
CREATE INDEX barbara_property_transactions_property_id_idx ON public.barbara_property_transactions (property_id);
CREATE INDEX barbara_property_transactions_txn_date_idx ON public.barbara_property_transactions (txn_date);

COMMENT ON TABLE public.barbara_property_transactions IS 'Barbara Ledger: property charges, payments, late fees, adjustments.';

-- -----------------------------------------------------------------------------
-- barbara_loans
-- -----------------------------------------------------------------------------
CREATE TABLE public.barbara_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  borrower_name text NOT NULL,
  borrower_phone text NOT NULL DEFAULT '',
  borrower_email text NOT NULL DEFAULT '',
  relationship text NOT NULL DEFAULT '',
  original_amount numeric(14, 2) NOT NULL DEFAULT 0,
  loan_date date,
  interest_rate numeric(7, 4) NOT NULL DEFAULT 0,
  payment_due_date text NOT NULL DEFAULT '',
  expected_monthly_payment numeric(14, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Active'
    CHECK (status IN ('Active', 'Paid Off', 'Past Due', 'Written Off')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX barbara_loans_user_id_idx ON public.barbara_loans (user_id);

CREATE TRIGGER barbara_loans_set_updated_at
  BEFORE UPDATE ON public.barbara_loans
  FOR EACH ROW
  EXECUTE FUNCTION public.barbara_set_updated_at();

COMMENT ON TABLE public.barbara_loans IS 'Barbara Ledger: personal loans.';

-- -----------------------------------------------------------------------------
-- barbara_loan_transactions
-- -----------------------------------------------------------------------------
CREATE TABLE public.barbara_loan_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  loan_id uuid NOT NULL REFERENCES public.barbara_loans (id) ON DELETE CASCADE,
  txn_date date NOT NULL,
  type text NOT NULL
    CHECK (type IN ('charge', 'payment', 'adjustment')),
  description text NOT NULL DEFAULT '',
  charge_amount numeric(14, 2) NOT NULL DEFAULT 0,
  payment_amount numeric(14, 2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT '',
  check_number text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX barbara_loan_transactions_user_id_idx ON public.barbara_loan_transactions (user_id);
CREATE INDEX barbara_loan_transactions_loan_id_idx ON public.barbara_loan_transactions (loan_id);
CREATE INDEX barbara_loan_transactions_txn_date_idx ON public.barbara_loan_transactions (txn_date);

COMMENT ON TABLE public.barbara_loan_transactions IS 'Barbara Ledger: loan charges, payments, adjustments.';

-- -----------------------------------------------------------------------------
-- barbara_notes
-- -----------------------------------------------------------------------------
CREATE TABLE public.barbara_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  related_type text NOT NULL
    CHECK (related_type IN ('property', 'loan', 'general')),
  related_id text NOT NULL DEFAULT '',
  note_date date NOT NULL,
  note_text text NOT NULL,
  reminder_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX barbara_notes_user_id_idx ON public.barbara_notes (user_id);
CREATE INDEX barbara_notes_related_idx ON public.barbara_notes (related_type, related_id);

COMMENT ON TABLE public.barbara_notes IS 'Barbara Ledger: notes attached to properties, loans, or general.';

-- -----------------------------------------------------------------------------
-- barbara_documents (metadata + path into Storage; private bucket)
-- -----------------------------------------------------------------------------
CREATE TABLE public.barbara_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  document_name text NOT NULL,
  document_type text NOT NULL,
  related_type text NOT NULL
    CHECK (related_type IN ('property', 'loan', 'general', 'template')),
  related_id text NOT NULL DEFAULT '',
  storage_path text,
  file_name text,
  mime_type text,
  size_bytes bigint,
  template_body text,
  notes text NOT NULL DEFAULT '',
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX barbara_documents_user_id_idx ON public.barbara_documents (user_id);
CREATE INDEX barbara_documents_related_idx ON public.barbara_documents (related_type, related_id);

COMMENT ON TABLE public.barbara_documents IS 'Barbara Ledger: document metadata; files live in storage bucket barbara-documents.';
COMMENT ON COLUMN public.barbara_documents.storage_path IS 'Object path inside bucket barbara-documents (private).';
COMMENT ON COLUMN public.barbara_documents.template_body IS 'Optional pasted template text when no file is stored.';

-- -----------------------------------------------------------------------------
-- barbara_activities (dashboard activity feed)
-- -----------------------------------------------------------------------------
CREATE TABLE public.barbara_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  activity_date date NOT NULL,
  type text NOT NULL
    CHECK (type IN ('payment', 'note', 'late_fee', 'document', 'charge')),
  entity_type text NOT NULL
    CHECK (entity_type IN ('property', 'loan')),
  entity_id text NOT NULL DEFAULT '',
  entity_name text NOT NULL DEFAULT '',
  person_name text NOT NULL DEFAULT '',
  amount numeric(14, 2) NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT ''
);

CREATE INDEX barbara_activities_user_id_idx ON public.barbara_activities (user_id);
CREATE INDEX barbara_activities_activity_date_idx ON public.barbara_activities (activity_date DESC);

COMMENT ON TABLE public.barbara_activities IS 'Barbara Ledger: recent activity feed rows per user.';

-- -----------------------------------------------------------------------------
-- Row Level Security — Barbara tables only
-- -----------------------------------------------------------------------------
ALTER TABLE public.barbara_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbara_property_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbara_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbara_loan_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbara_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbara_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbara_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY barbara_properties_isolation
  ON public.barbara_properties
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY barbara_property_transactions_isolation
  ON public.barbara_property_transactions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY barbara_loans_isolation
  ON public.barbara_loans
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY barbara_loan_transactions_isolation
  ON public.barbara_loan_transactions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY barbara_notes_isolation
  ON public.barbara_notes
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY barbara_documents_isolation
  ON public.barbara_documents
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY barbara_activities_isolation
  ON public.barbara_activities
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Storage: private bucket barbara-documents only
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'barbara-documents',
  'barbara-documents',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: objects must live under folder named with the owner's auth uid
CREATE POLICY barbara_documents_storage_select
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'barbara-documents'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY barbara_documents_storage_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'barbara-documents'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY barbara_documents_storage_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'barbara-documents'
    AND split_part(name, '/', 1) = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'barbara-documents'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY barbara_documents_storage_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'barbara-documents'
    AND split_part(name, '/', 1) = auth.uid()::text
  );
