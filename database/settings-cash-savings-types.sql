-- =============================================================================
-- Migration: Cash & Savings selected Account Type + Cash Type IDs
-- =============================================================================
-- Run in Supabase SQL Editor (safe to re-run).
-- Drives dashboard Cash & Savings card and /cash-savings page.
-- =============================================================================

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS cash_savings_cash_type_ids UUID[] NOT NULL DEFAULT '{}';

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS cash_savings_account_type_ids UUID[] NOT NULL DEFAULT '{}';

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
      'updated_at', now()
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.rpc_get_app_settings() TO anon, authenticated, service_role;
