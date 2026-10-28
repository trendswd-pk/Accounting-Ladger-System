-- =============================================================================
-- Accounts (Dashboard → Accounts)
-- =============================================================================
-- Run in Supabase → SQL Editor after account_types + cash_types exist.
-- Balance is not stored — computed from transactions (credit +, debit −).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  account_type_id UUID NOT NULL REFERENCES public.account_types (id) ON DELETE RESTRICT,
  cash_type_id UUID NOT NULL REFERENCES public.cash_types (id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accounts_created_at ON public.accounts (created_at ASC);
CREATE INDEX IF NOT EXISTS idx_accounts_account_type_id ON public.accounts (account_type_id);
CREATE INDEX IF NOT EXISTS idx_accounts_cash_type_id ON public.accounts (cash_type_id);
CREATE INDEX IF NOT EXISTS idx_accounts_name ON public.accounts (name);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read accounts" ON public.accounts;
DROP POLICY IF EXISTS "Allow anon insert accounts" ON public.accounts;
DROP POLICY IF EXISTS "Allow anon update accounts" ON public.accounts;
DROP POLICY IF EXISTS "Allow anon delete accounts" ON public.accounts;

CREATE POLICY "Allow anon read accounts"
  ON public.accounts FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert accounts"
  ON public.accounts FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update accounts"
  ON public.accounts FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete accounts"
  ON public.accounts FOR DELETE TO anon USING (true);

GRANT ALL ON public.accounts TO anon;
GRANT ALL ON public.accounts TO service_role;

-- One-shot list with type names (avoids N+1 joins from the client)
CREATE OR REPLACE FUNCTION public.rpc_list_accounts()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'name', a.name,
        'phone', a.phone,
        'account_type_id', a.account_type_id,
        'cash_type_id', a.cash_type_id,
        'account_type_name', at.name,
        'account_type_code', at.code,
        'cash_type_name', ct.name,
        'cash_type_code', ct.code,
        'created_at', a.created_at,
        'balance', COALESCE((
          SELECT SUM(
            CASE
              WHEN LOWER(COALESCE(t.entry_type, 'credit')) = 'debit'
                THEN -ABS(t.balance)
              ELSE ABS(t.balance)
            END
          )
          FROM public.transactions t
          WHERE t.account_id = a.id
        ), 0)
      )
      ORDER BY a.created_at ASC, a.name ASC
    ),
    '[]'::jsonb
  )
  FROM public.accounts a
  JOIN public.account_types at ON at.id = a.account_type_id
  JOIN public.cash_types ct ON ct.id = a.cash_type_id;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_list_accounts() TO anon, authenticated, service_role;
