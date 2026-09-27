-- Second adult on a lease. Does not change existing tenant, payment, or balance rows.

ALTER TABLE public.barbara_properties
  ADD COLUMN IF NOT EXISTS co_tenant_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS co_tenant_email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS co_tenant_phone text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.barbara_properties.co_tenant_name IS
  'Second adult on the lease. Separate from tenant_name when the adults are not one household name.';
