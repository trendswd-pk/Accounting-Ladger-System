-- =============================================================================
-- Migration: add narration / details to transactions
-- =============================================================================
-- Run in Supabase SQL Editor (safe to re-run).
-- =============================================================================

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS narration TEXT NOT NULL DEFAULT '';

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
        'narration', COALESCE(t.narration, ''),
        'entry_type', COALESCE(t.entry_type, 'credit'),
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
