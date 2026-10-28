-- =============================================================================
-- Migration: add credit / debit to transactions
-- =============================================================================
-- Run in Supabase SQL Editor (safe to re-run).
-- =============================================================================

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS entry_type TEXT NOT NULL DEFAULT 'credit';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transactions_entry_type_check'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_entry_type_check
      CHECK (entry_type IN ('credit', 'debit'));
  END IF;
END $$;

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
        'entry_type', t.entry_type,
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
