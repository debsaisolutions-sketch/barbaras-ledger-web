-- Barbara's Ledger: Sold status + sale fields on barbara_properties only.
-- (Idempotent if you already ran this manually.)

ALTER TABLE public.barbara_properties
  DROP CONSTRAINT IF EXISTS barbara_properties_status_check;

ALTER TABLE public.barbara_properties
  ADD CONSTRAINT barbara_properties_status_check
  CHECK (status IN ('Active', 'Vacant', 'Past Due', 'Closed', 'Sold'));

ALTER TABLE public.barbara_properties
  ADD COLUMN IF NOT EXISTS sold_date date,
  ADD COLUMN IF NOT EXISTS sale_price numeric(14, 2),
  ADD COLUMN IF NOT EXISTS buyer_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sale_notes text NOT NULL DEFAULT '';
