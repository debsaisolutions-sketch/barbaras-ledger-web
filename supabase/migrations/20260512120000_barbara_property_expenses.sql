-- EasyLedger / Barbara: rental property repairs & expenses (barbara_* only)

CREATE TABLE public.barbara_property_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.barbara_properties (id) ON DELETE CASCADE,
  expense_date date NOT NULL,
  category text NOT NULL DEFAULT 'Other',
  description text NOT NULL DEFAULT '',
  vendor_name text NOT NULL DEFAULT '',
  amount numeric(14, 2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT '',
  reference_number text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  document_id uuid REFERENCES public.barbara_documents (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX barbara_property_expenses_user_id_idx ON public.barbara_property_expenses (user_id);
CREATE INDEX barbara_property_expenses_property_id_idx ON public.barbara_property_expenses (property_id);
CREATE INDEX barbara_property_expenses_expense_date_idx ON public.barbara_property_expenses (expense_date);

COMMENT ON TABLE public.barbara_property_expenses IS 'Barbara Ledger: maintenance, repairs, and rental property expenses for your records.';

ALTER TABLE public.barbara_property_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY barbara_property_expenses_isolation
  ON public.barbara_property_expenses
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
