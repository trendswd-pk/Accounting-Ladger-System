-- =============================================================================
-- Migration: default transaction entry mode (normal | transfer)
-- =============================================================================
-- Run in Supabase SQL Editor (safe to re-run).
-- =============================================================================

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS default_entry_mode TEXT NOT NULL DEFAULT 'normal';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'app_settings_default_entry_mode_check'
  ) THEN
    ALTER TABLE public.app_settings
      ADD CONSTRAINT app_settings_default_entry_mode_check
      CHECK (default_entry_mode IN ('normal', 'transfer'));
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
      'updated_at', now()
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.rpc_get_app_settings() TO anon, authenticated, service_role;
