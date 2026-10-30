-- =============================================================================
-- Migration: Account message → ledger PDF URL setting
-- Date: 2026-10-30
--
-- Run this in Supabase → SQL Editor (existing production / staging DB).
-- Safe to re-run (idempotent).
--
-- What it does:
--   1) Adds app_settings.account_message_include_ledger_url (default true)
--   2) Refreshes rpc_get_app_settings() so the API returns the new flag
--   3) Optionally appends "Ledger: {{ledger_url}}" to the default account
--      template when that placeholder is still missing
-- =============================================================================

-- 1) Columns
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS account_message_include_ledger_url BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS transaction_message_include_pdf_url BOOLEAN NOT NULL DEFAULT true;

-- 2) RPC (must match database/schema.sql)
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
        'account_message_template', COALESCE(s.account_message_template, ''),
        'transaction_message_template', COALESCE(s.transaction_message_template, ''),
        'message_note_plus', COALESCE(
          s.message_note_plus,
          'Plus (+) balance: payment receivable — they will pay you.'
        ),
        'message_note_minus', COALESCE(
          s.message_note_minus,
          'Minus (−) balance: payment payable — you will pay them.'
        ),
        'message_note_zero', COALESCE(
          s.message_note_zero,
          'Zero balance: everything is settled / all clear.'
        ),
        'account_message_include_ledger_url', COALESCE(s.account_message_include_ledger_url, true),
        'transaction_message_include_pdf_url', COALESCE(s.transaction_message_include_pdf_url, true),
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
      'account_message_template', '',
      'transaction_message_template', '',
      'message_note_plus', 'Plus (+) balance: payment receivable — they will pay you.',
      'message_note_minus', 'Minus (−) balance: payment payable — you will pay them.',
      'message_note_zero', 'Zero balance: everything is settled / all clear.',
      'account_message_include_ledger_url', true,
      'transaction_message_include_pdf_url', true,
      'cash_savings_cash_type_ids', '[]'::jsonb,
      'cash_savings_account_type_ids', '[]'::jsonb,
      'payable_receivable_cash_type_ids', '[]'::jsonb,
      'payable_receivable_account_type_ids', '[]'::jsonb,
      'updated_at', now()
    )
  );
$$;

-- 3) Append ledger placeholder only when the stock template has no {{ledger_url}} yet
UPDATE public.app_settings
SET account_message_template = trim(both E'\n' from account_message_template)
  || E'\n\nLedger: {{ledger_url}}'
WHERE id = 1
  AND COALESCE(TRIM(account_message_template), '') <> ''
  AND account_message_template NOT LIKE '%{{ledger_url}}%';
