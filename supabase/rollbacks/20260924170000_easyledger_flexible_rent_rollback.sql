-- Rollback for 20260924170000_easyledger_flexible_rent.sql
-- Not a migration. Do not place this file in supabase/migrations.
-- Reverses added columns, the new reminders table, and the widened notes check.
-- Does not delete properties, payments, loans, notes, or expenses.
--
-- reminder_completed and reminder_completed_at may already have existed before
-- this migration (the app was already writing them). Drop those two columns
-- only if a pre-migration schema snapshot shows they were absent.

DROP POLICY IF EXISTS barbara_reminders_isolation ON public.barbara_reminders;
DROP TRIGGER IF EXISTS barbara_reminders_set_updated_at ON public.barbara_reminders;
DROP TABLE IF EXISTS public.barbara_reminders;

DROP INDEX IF EXISTS public.barbara_notes_property_id_idx;

ALTER TABLE public.barbara_notes DROP CONSTRAINT IF EXISTS barbara_notes_related_type_check;
ALTER TABLE public.barbara_notes
  ADD CONSTRAINT barbara_notes_related_type_check
  CHECK (related_type IN ('property', 'loan', 'general'));

ALTER TABLE public.barbara_notes
  DROP COLUMN IF EXISTS property_id,
  DROP COLUMN IF EXISTS loan_id;

ALTER TABLE public.barbara_property_expenses
  DROP CONSTRAINT IF EXISTS barbara_property_expenses_work_status_check;
ALTER TABLE public.barbara_property_expenses
  DROP CONSTRAINT IF EXISTS barbara_property_expenses_priority_check;
ALTER TABLE public.barbara_property_expenses
  DROP COLUMN IF EXISTS completed_date,
  DROP COLUMN IF EXISTS estimated_cost,
  DROP COLUMN IF EXISTS target_date,
  DROP COLUMN IF EXISTS work_status,
  DROP COLUMN IF EXISTS priority,
  DROP COLUMN IF EXISTS title;

ALTER TABLE public.barbara_loan_transactions
  DROP COLUMN IF EXISTS void_reason,
  DROP COLUMN IF EXISTS voided_at;

ALTER TABLE public.barbara_property_transactions
  DROP COLUMN IF EXISTS void_reason,
  DROP COLUMN IF EXISTS voided_at,
  DROP COLUMN IF EXISTS rent_period_end,
  DROP COLUMN IF EXISTS rent_period_start;

ALTER TABLE public.barbara_loans
  DROP COLUMN IF EXISTS reminder_dismissed;
-- DROP COLUMN IF EXISTS reminder_completed_at;
-- DROP COLUMN IF EXISTS reminder_completed;

ALTER TABLE public.barbara_properties
  DROP CONSTRAINT IF EXISTS barbara_properties_rent_frequency_check;
ALTER TABLE public.barbara_properties
  DROP COLUMN IF EXISTS reminder_dismissed,
  DROP COLUMN IF EXISTS loan_notes,
  DROP COLUMN IF EXISTS loan_interest_rate,
  DROP COLUMN IF EXISTS loan_payment_due,
  DROP COLUMN IF EXISTS loan_payment_frequency,
  DROP COLUMN IF EXISTS loan_payment_amount,
  DROP COLUMN IF EXISTS remaining_loan_balance,
  DROP COLUMN IF EXISTS original_loan_amount,
  DROP COLUMN IF EXISTS lender,
  DROP COLUMN IF EXISTS loan_paid_off,
  DROP COLUMN IF EXISTS rent_interval_days,
  DROP COLUMN IF EXISTS rent_anchor_date,
  DROP COLUMN IF EXISTS rent_frequency;
-- DROP COLUMN IF EXISTS reminder_completed_at;
-- DROP COLUMN IF EXISTS reminder_completed;
