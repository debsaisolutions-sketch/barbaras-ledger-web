ALTER TABLE public.barbara_properties
  ADD COLUMN IF NOT EXISTS skipped_rent_periods text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.barbara_properties.skipped_rent_periods IS
  'Rent periods the landlord removed, stored as start|end. Hidden and not counted as owed.';
