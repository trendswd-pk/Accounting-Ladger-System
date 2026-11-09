-- =============================================================================
-- Allow Multi Transaction as a default entry mode on app_settings.
-- Run in Supabase → SQL Editor (idempotent).
-- =============================================================================

ALTER TABLE public.app_settings
  DROP CONSTRAINT IF EXISTS app_settings_default_entry_mode_check;

ALTER TABLE public.app_settings
  ADD CONSTRAINT app_settings_default_entry_mode_check
  CHECK (default_entry_mode IN ('normal', 'transfer', 'multi'));
