-- =============================================================================
-- Dashboard Expenses card: calendar period (week / month / year), not rolling days.
-- Run in Supabase → SQL Editor (idempotent).
-- =============================================================================

-- Preferred text column
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS dashboard_expense_period TEXT NOT NULL DEFAULT 'all';

-- Legacy day-count column (older draft of this feature)
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS dashboard_expense_period_days INTEGER NOT NULL DEFAULT 0;

-- Migrate any saved day counts into calendar periods.
UPDATE public.app_settings
SET dashboard_expense_period = CASE
  WHEN dashboard_expense_period IS NOT NULL
    AND dashboard_expense_period <> 'all'
    AND dashboard_expense_period <> ''
    THEN dashboard_expense_period
  WHEN COALESCE(dashboard_expense_period_days, 0) <= 0 THEN 'all'
  WHEN dashboard_expense_period_days <= 7 THEN 'week'
  WHEN dashboard_expense_period_days <= 31 THEN 'month'
  WHEN dashboard_expense_period_days <= 100 THEN 'months_3'
  WHEN dashboard_expense_period_days <= 200 THEN 'months_6'
  ELSE 'year'
END
WHERE id = 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'app_settings_dashboard_expense_period_check'
  ) THEN
    ALTER TABLE public.app_settings
      ADD CONSTRAINT app_settings_dashboard_expense_period_check
      CHECK (
        dashboard_expense_period IN (
          'all', 'week', 'month', 'months_3', 'months_6', 'year'
        )
      );
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
        'transaction_message_include_ledger_url', COALESCE(s.transaction_message_include_ledger_url, true),
        'ledger_share_require_pin', COALESCE(s.ledger_share_require_pin, true),
        'ledger_share_ttl_hours', COALESCE(s.ledger_share_ttl_hours, 24),
        'dashboard_expense_period', COALESCE(s.dashboard_expense_period, 'all'),
        'dashboard_expense_period_days', COALESCE(s.dashboard_expense_period_days, 0),
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
      'business_name', 'Trends WD',
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
      'transaction_message_include_ledger_url', true,
      'ledger_share_require_pin', true,
      'ledger_share_ttl_hours', 24,
      'dashboard_expense_period', 'all',
      'dashboard_expense_period_days', 0,
      'cash_savings_cash_type_ids', '[]'::jsonb,
      'cash_savings_account_type_ids', '[]'::jsonb,
      'payable_receivable_cash_type_ids', '[]'::jsonb,
      'payable_receivable_account_type_ids', '[]'::jsonb,
      'updated_at', now()
    )
  );
$$;
