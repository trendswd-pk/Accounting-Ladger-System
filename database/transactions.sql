-- =============================================================================
-- Transactions (Dashboard → Transactions)
-- =============================================================================
-- Run after accounts table exists.
-- entry_number = permanent SR.; balance is the entry amount for now.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number BIGSERIAL UNIQUE,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  account_id UUID NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  balance NUMERIC(18, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_date
  ON public.transactions (transaction_date DESC, entry_number DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id
  ON public.transactions (account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_entry_number
  ON public.transactions (entry_number);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow anon insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow anon update transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow anon delete transactions" ON public.transactions;

CREATE POLICY "Allow anon read transactions"
  ON public.transactions FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert transactions"
  ON public.transactions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update transactions"
  ON public.transactions FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete transactions"
  ON public.transactions FOR DELETE TO anon USING (true);

GRANT ALL ON public.transactions TO anon;
GRANT ALL ON public.transactions TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.transactions_entry_number_seq TO anon, service_role;

CREATE OR REPLACE FUNCTION public.rpc_list_transactions()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'entry_number', t.entry_number,
        'transaction_date', t.transaction_date,
        'account_id', t.account_id,
        'account_name', a.name,
        'balance', t.balance,
        'created_at', t.created_at
      )
      ORDER BY t.entry_number DESC
    ),
    '[]'::jsonb
  )
  FROM public.transactions t
  JOIN public.accounts a ON a.id = t.account_id;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_list_transactions() TO anon, authenticated, service_role;
