-- EasyLedger: flexible rent, repairs without a price, property financing, notes, and reminders.
-- Additive only. Does not drop tables or rewrite existing financial amounts.

-- -----------------------------------------------------------------------------
-- Properties: rent schedule + optional mortgage details
-- Existing rows default to monthly rent and "paid off / no loan entered".
-- monthly_rent stays the expected amount per period.
-- -----------------------------------------------------------------------------
ALTER TABLE public.barbara_properties
  ADD COLUMN IF NOT EXISTS rent_frequency text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS rent_anchor_date date,
  ADD COLUMN IF NOT EXISTS rent_interval_days integer,
  ADD COLUMN IF NOT EXISTS loan_paid_off boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS lender text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS original_loan_amount numeric(14, 2),
  ADD COLUMN IF NOT EXISTS remaining_loan_balance numeric(14, 2),
  ADD COLUMN IF NOT EXISTS loan_payment_amount numeric(14, 2),
  ADD COLUMN IF NOT EXISTS loan_payment_frequency text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS loan_payment_due text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS loan_interest_rate numeric(7, 4),
  ADD COLUMN IF NOT EXISTS loan_notes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS reminder_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_dismissed boolean NOT NULL DEFAULT false;

ALTER TABLE public.barbara_properties
  DROP CONSTRAINT IF EXISTS barbara_properties_rent_frequency_check;

ALTER TABLE public.barbara_properties
  ADD CONSTRAINT barbara_properties_rent_frequency_check
  CHECK (rent_frequency IN ('weekly', 'biweekly', 'monthly', 'custom'));

COMMENT ON COLUMN public.barbara_properties.rent_frequency IS 'Expected rent cadence. Does not restrict payment dates.';
COMMENT ON COLUMN public.barbara_properties.monthly_rent IS 'Expected rent amount for each period (weekly, bi-weekly, monthly, or custom).';
COMMENT ON COLUMN public.barbara_properties.loan_paid_off IS 'True when the property has no loan, or the loan is paid off. Loan detail columns are optional.';

-- -----------------------------------------------------------------------------
-- Loans: reminder completion columns already used by the app
-- -----------------------------------------------------------------------------
ALTER TABLE public.barbara_loans
  ADD COLUMN IF NOT EXISTS reminder_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_dismissed boolean NOT NULL DEFAULT false;

-- -----------------------------------------------------------------------------
-- Property transactions: optional rent period + void (keeps the row)
-- -----------------------------------------------------------------------------
ALTER TABLE public.barbara_property_transactions
  ADD COLUMN IF NOT EXISTS rent_period_start date,
  ADD COLUMN IF NOT EXISTS rent_period_end date,
  ADD COLUMN IF NOT EXISTS voided_at timestamptz,
  ADD COLUMN IF NOT EXISTS void_reason text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.barbara_property_transactions.voided_at IS 'When set, the row stays for history but is excluded from balances and rent totals.';
COMMENT ON COLUMN public.barbara_property_transactions.rent_period_start IS 'Optional period this rent payment applies to. Payment date may differ.';

ALTER TABLE public.barbara_loan_transactions
  ADD COLUMN IF NOT EXISTS voided_at timestamptz,
  ADD COLUMN IF NOT EXISTS void_reason text NOT NULL DEFAULT '';

-- -----------------------------------------------------------------------------
-- Repairs / expenses: price stays optional (amount 0 means no cost recorded yet)
-- Existing rows default to Completed so current receipts stay completed expenses.
-- -----------------------------------------------------------------------------
ALTER TABLE public.barbara_property_expenses
  ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'Normal',
  ADD COLUMN IF NOT EXISTS work_status text NOT NULL DEFAULT 'Completed',
  ADD COLUMN IF NOT EXISTS target_date date,
  ADD COLUMN IF NOT EXISTS estimated_cost numeric(14, 2),
  ADD COLUMN IF NOT EXISTS completed_date date;

ALTER TABLE public.barbara_property_expenses
  DROP CONSTRAINT IF EXISTS barbara_property_expenses_priority_check;

ALTER TABLE public.barbara_property_expenses
  ADD CONSTRAINT barbara_property_expenses_priority_check
  CHECK (priority IN ('Low', 'Normal', 'High'));

ALTER TABLE public.barbara_property_expenses
  DROP CONSTRAINT IF EXISTS barbara_property_expenses_work_status_check;

ALTER TABLE public.barbara_property_expenses
  ADD CONSTRAINT barbara_property_expenses_work_status_check
  CHECK (work_status IN (
    'Needs Attention',
    'Planned',
    'Waiting on Funds',
    'Scheduled',
    'In Progress',
    'Completed'
  ));

COMMENT ON COLUMN public.barbara_property_expenses.amount IS 'Actual cost. 0 means no money has been recorded yet.';
COMMENT ON COLUMN public.barbara_property_expenses.estimated_cost IS 'Optional estimate. Null when unknown.';

-- -----------------------------------------------------------------------------
-- Notes: more optional associations. Existing property/loan/general rows remain valid.
-- -----------------------------------------------------------------------------
ALTER TABLE public.barbara_notes
  ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.barbara_properties (id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS loan_id uuid REFERENCES public.barbara_loans (id) ON DELETE CASCADE;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'barbara_notes'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%related_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.barbara_notes DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.barbara_notes
  ADD CONSTRAINT barbara_notes_related_type_check
  CHECK (related_type IN ('property', 'loan', 'general', 'payment', 'repair', 'tenant'));

CREATE INDEX IF NOT EXISTS barbara_notes_property_id_idx ON public.barbara_notes (property_id)
  WHERE property_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- Reminders: many per account, optional link, can be completed, dismissed, or deleted
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.barbara_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  due_date date NOT NULL,
  note text NOT NULL DEFAULT '',
  related_type text NOT NULL DEFAULT 'general'
    CHECK (related_type IN ('property', 'loan', 'payment', 'repair', 'general', 'tenant')),
  related_id text NOT NULL DEFAULT '',
  property_id uuid REFERENCES public.barbara_properties (id) ON DELETE CASCADE,
  loan_id uuid REFERENCES public.barbara_loans (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'completed', 'dismissed')),
  completed_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS barbara_reminders_user_id_idx ON public.barbara_reminders (user_id);
CREATE INDEX IF NOT EXISTS barbara_reminders_due_date_idx ON public.barbara_reminders (due_date);
CREATE INDEX IF NOT EXISTS barbara_reminders_property_id_idx ON public.barbara_reminders (property_id)
  WHERE property_id IS NOT NULL;

DROP TRIGGER IF EXISTS barbara_reminders_set_updated_at ON public.barbara_reminders;
CREATE TRIGGER barbara_reminders_set_updated_at
  BEFORE UPDATE ON public.barbara_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.barbara_set_updated_at();

ALTER TABLE public.barbara_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS barbara_reminders_isolation ON public.barbara_reminders;
CREATE POLICY barbara_reminders_isolation
  ON public.barbara_reminders
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE public.barbara_reminders IS 'Barbara Ledger: follow-up reminders. Separate from financial transactions.';
