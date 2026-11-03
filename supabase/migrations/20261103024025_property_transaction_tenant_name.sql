-- EasyLedger: remember who a new charge or payment belongs to.
-- Does not rename tables. Does not update or delete existing rows.
-- Existing rows stay blank. The app assigns those from the lease start date
-- until a name is saved on the row. This file is not applied automatically.

ALTER TABLE public.barbara_property_transactions
  ADD COLUMN IF NOT EXISTS tenant_name text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.barbara_property_transactions.tenant_name IS
  'Who this charge or payment belongs to. Blank rows follow the property lease start: dates before lease_start belong to prior_tenant_name.';
