-- EasyLedger: record contracts sent through the same DocuSeal account as TradeDeskPro.
-- Additive only. Does not change payments, balances, or existing documents.

CREATE TABLE IF NOT EXISTS public.barbara_contract_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.barbara_properties (id) ON DELETE CASCADE,
  template_id text NOT NULL,
  template_name text NOT NULL DEFAULT '',
  signer_name text NOT NULL DEFAULT '',
  signer_email text NOT NULL,
  submission_id text NOT NULL,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'signed')),
  document_id uuid REFERENCES public.barbara_documents (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS barbara_contract_sends_user_id_idx
  ON public.barbara_contract_sends (user_id);
CREATE INDEX IF NOT EXISTS barbara_contract_sends_property_id_idx
  ON public.barbara_contract_sends (property_id)
  WHERE property_id IS NOT NULL;

ALTER TABLE public.barbara_contract_sends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS barbara_contract_sends_isolation ON public.barbara_contract_sends;
CREATE POLICY barbara_contract_sends_isolation
  ON public.barbara_contract_sends
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE public.barbara_contract_sends IS
  'Contracts sent for signature. The signed PDF is stored in barbara_documents.';
