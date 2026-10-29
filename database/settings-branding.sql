-- =============================================================================
-- Migration: Optional business logo + favicon URLs on app_settings
-- =============================================================================
-- Run in Supabase SQL Editor (safe to re-run).
-- =============================================================================

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS favicon_url TEXT;

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
        'logo_url', s.logo_url,
        'favicon_url', s.favicon_url,
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
      'logo_url', null,
      'favicon_url', null,
      'cash_savings_cash_type_ids', '[]'::jsonb,
      'cash_savings_account_type_ids', '[]'::jsonb,
      'payable_receivable_cash_type_ids', '[]'::jsonb,
      'payable_receivable_account_type_ids', '[]'::jsonb,
      'updated_at', now()
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.rpc_get_app_settings() TO anon, authenticated, service_role;
