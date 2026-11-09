-- =============================================================================
-- Floating action button labels: show/hide text beside speed-dial icons.
-- Default false (icons only). Run in Supabase → SQL Editor (idempotent).
-- =============================================================================

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS floating_actions_show_labels BOOLEAN NOT NULL DEFAULT false;

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
        'floating_actions_show_labels', COALESCE(s.floating_actions_show_labels, false),
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
      'floating_actions_show_labels', false,
      'cash_savings_cash_type_ids', '[]'::jsonb,
      'cash_savings_account_type_ids', '[]'::jsonb,
      'payable_receivable_cash_type_ids', '[]'::jsonb,
      'payable_receivable_account_type_ids', '[]'::jsonb,
      'updated_at', now()
    )
  );
$$;
