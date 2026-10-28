-- =============================================================================
-- Migration: account balance from transactions in rpc_list_accounts
-- =============================================================================
-- Run in Supabase SQL Editor after transactions (+ entry_type) exist.
-- Safe to re-run.
-- =============================================================================

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
