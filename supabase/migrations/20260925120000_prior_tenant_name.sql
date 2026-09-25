-- Optional name for whoever lived in the property before the current lease.
ALTER TABLE public.barbara_properties
  ADD COLUMN IF NOT EXISTS prior_tenant_name text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.barbara_properties.prior_tenant_name IS
  'Previous occupant. Payments dated before lease_start are shown under this name.';
