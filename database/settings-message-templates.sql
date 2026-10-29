-- =============================================================================
-- Migration: Account + transaction WhatsApp/share message templates
-- =============================================================================
-- Run in Supabase SQL Editor (safe to re-run).
-- Use {{variable}} placeholders in templates (see Settings UI).
-- =============================================================================

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS account_message_template TEXT NOT NULL DEFAULT '';

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS transaction_message_template TEXT NOT NULL DEFAULT '';

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS message_note_plus TEXT NOT NULL DEFAULT
    'Plus (+) balance: payment receivable — they will pay you.';

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS message_note_minus TEXT NOT NULL DEFAULT
    'Minus (−) balance: payment payable — you will pay them.';

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS message_note_zero TEXT NOT NULL DEFAULT
    'Zero balance: everything is settled / all clear.';

UPDATE public.app_settings
SET message_note_plus = 'Plus (+) balance: payment receivable — they will pay you.'
WHERE id = 1 AND COALESCE(TRIM(message_note_plus), '') = '';

UPDATE public.app_settings
SET message_note_minus = 'Minus (−) balance: payment payable — you will pay them.'
WHERE id = 1 AND COALESCE(TRIM(message_note_minus), '') = '';

UPDATE public.app_settings
SET message_note_zero = 'Zero balance: everything is settled / all clear.'
WHERE id = 1 AND COALESCE(TRIM(message_note_zero), '') = '';

-- Seed / refresh templates (empty or still using the old long static Note)
UPDATE public.app_settings
SET account_message_template = $msg$Account Balance Details
--------------------------
Account: {{name}}
Phone: {{phone}}
Current Balance: {{balance}}

Note: {{note}}$msg$
WHERE id = 1
  AND (
    COALESCE(TRIM(account_message_template), '') = ''
    OR account_message_template LIKE '%A plus (+) balance means this account owes you%'
    OR (
      account_message_template LIKE '%Note:%'
      AND account_message_template NOT LIKE '%{{note}}%'
    )
  );

UPDATE public.app_settings
SET transaction_message_template = $msg$Transaction Details
--------------------------
Date: {{date}}
Account: {{account_name}}
Type: {{entry_type}}
Narration: {{narration}}
Amount: {{amount}}

Previous Balance: {{previous_balance}}
Current Transaction: {{current_transaction}}
Current Balance: {{current_balance}}

Note: {{note}}$msg$
WHERE id = 1
  AND (
    COALESCE(TRIM(transaction_message_template), '') = ''
    OR transaction_message_template LIKE '%A plus (+) balance means this account owes you%'
    OR (
      transaction_message_template LIKE '%Note:%'
      AND transaction_message_template NOT LIKE '%{{note}}%'
    )
  );

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
        'message_note_plus', COALESCE(s.message_note_plus, 'Plus (+) balance: payment receivable — they will pay you.'),
        'message_note_minus', COALESCE(s.message_note_minus, 'Minus (−) balance: payment payable — you will pay them.'),
        'message_note_zero', COALESCE(s.message_note_zero, 'Zero balance: everything is settled / all clear.'),
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
      'cash_savings_cash_type_ids', '[]'::jsonb,
      'cash_savings_account_type_ids', '[]'::jsonb,
      'payable_receivable_cash_type_ids', '[]'::jsonb,
      'payable_receivable_account_type_ids', '[]'::jsonb,
      'updated_at', now()
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.rpc_get_app_settings() TO anon, authenticated, service_role;
