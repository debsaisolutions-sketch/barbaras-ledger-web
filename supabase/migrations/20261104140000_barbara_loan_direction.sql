-- EasyLedger / Barbara: loan direction (money lent out vs money I borrowed)
-- Does not touch Debt GPS tables.

ALTER TABLE public.barbara_loans
  ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'taken';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'barbara_loans_direction_check'
      AND conrelid = 'public.barbara_loans'::regclass
  ) THEN
    ALTER TABLE public.barbara_loans
      ADD CONSTRAINT barbara_loans_direction_check
      CHECK (direction IN ('given', 'taken'));
  END IF;
END $$;

COMMENT ON COLUMN public.barbara_loans.direction IS
  'given = I lent money (they owe me); taken = I borrowed money (I owe them). Other party stored in borrower_name.';

-- Existing rows (often defaulted to given earlier) are money the owner owes.
UPDATE public.barbara_loans
SET direction = 'taken';
