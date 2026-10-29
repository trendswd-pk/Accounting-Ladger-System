-- =============================================================================
-- Migration: Dashboard filter Account Type + Cash Type IDs
-- Cash & Savings / Payable & Receivable
-- =============================================================================
-- Run in Supabase SQL Editor (safe to re-run).
-- =============================================================================

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS cash_savings_cash_type_ids UUID[] NOT NULL DEFAULT '{}';

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS cash_savings_account_type_ids UUID[] NOT NULL DEFAULT '{}';

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS payable_receivable_cash_type_ids UUID[] NOT NULL DEFAULT '{}';

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS payable_receivable_account_type_ids UUID[] NOT NULL DEFAULT '{}';

-- Optional cleanup if older separate columns exist (safe if absent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'app_settings'
      AND column_name = 'payable_account_type_ids'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'app_settings'
      AND column_name = 'payable_receivable_account_type_ids'
  ) THEN
    UPDATE public.app_settings
    SET
      payable_receivable_account_type_ids = CASE
        WHEN COALESCE(cardinality(payable_receivable_account_type_ids), 0) = 0
          THEN COALESCE(payable_account_type_ids, '{}')
        ELSE payable_receivable_account_type_ids
      END,
      payable_receivable_cash_type_ids = CASE
        WHEN COALESCE(cardinality(payable_receivable_cash_type_ids), 0) = 0
          THEN COALESCE(payable_cash_type_ids, '{}')
        ELSE payable_receivable_cash_type_ids
      END
    WHERE id = 1;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.rpc_get_app_settings()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT jsonb_build_object(
        'id', s.id,
        'business_name', s.business_name,
        'currency', s.currency,
        'theme', s.theme,
        'default_entry_mode', COALESCE(s.default_entry_mode, 'normal'),
        'cash_savings_cash_type_ids', COALESCE(to_jsonb(s.cash_savings_cash_type_ids), '[]'::jsonb),
        'cash_savings_account_type_ids', COALESCE(to_jsonb(s.cash_savings_account_type_ids), '[]'::jsonb),
        'payable_receivable_cash_type_ids', COALESCE(to_jsonb(s.payable_receivable_cash_type_ids), '[]'::jsonb),
        'payable_receivable_account_type_ids', COALESCE(to_jsonb(s.payable_receivable_account_type_ids), '[]'::jsonb),
        'updated_at', s.updated_at
      )
      FROM public.app_settings s
      WHERE s.id = 1
    ),
    jsonb_build_object(
      'id', 1,
      'business_name', 'My Business',
      'currency', 'PKR',
      'theme', 'dark',
      'default_entry_mode', 'normal',
      'cash_savings_cash_type_ids', '[]'::jsonb,
      'cash_savings_account_type_ids', '[]'::jsonb,
      'payable_receivable_cash_type_ids', '[]'::jsonb,
      'payable_receivable_account_type_ids', '[]'::jsonb,
      'updated_at', now()
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.rpc_get_app_settings() TO anon, authenticated, service_role;
