-- =============================================================================
-- Multi-tenant: one auth user = one private ledger
-- Run in Supabase → SQL Editor (idempotent).
-- Existing rows are assigned to the oldest auth.users row.
-- Optional tables (short_links, bank_details, ledger_shares, …) are created
-- or skipped if missing so older projects still migrate cleanly.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0) Ensure optional tables exist (no-op when already present)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.short_links (
  code TEXT PRIMARY KEY,
  target_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_short_links_created_at
  ON public.short_links (created_at DESC);
ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.short_links TO service_role;

CREATE TABLE IF NOT EXISTS public.bank_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name TEXT NOT NULL,
  account_title TEXT NOT NULL,
  account_number TEXT NOT NULL,
  iban TEXT NOT NULL DEFAULT '',
  branch_name TEXT NOT NULL DEFAULT '',
  branch_code TEXT NOT NULL DEFAULT '',
  swift_code TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  qr_code_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bank_details ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.bank_details TO service_role;

CREATE TABLE IF NOT EXISTS public.ledger_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL,
  account_id UUID NOT NULL REFERENCES public.accounts (id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL,
  require_pin BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ledger_shares_token_unique UNIQUE (token)
);
ALTER TABLE public.ledger_shares ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.ledger_shares TO service_role;

CREATE TABLE IF NOT EXISTS public.file_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_key TEXT NOT NULL,
  public_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  folder TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.file_attachments ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.file_attachments TO service_role;

-- -----------------------------------------------------------------------------
-- 0b) app_settings: allow one row per user (was singleton CHECK id = 1)
-- -----------------------------------------------------------------------------
ALTER TABLE public.app_settings DROP CONSTRAINT IF EXISTS app_settings_id_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'S' AND c.relname = 'app_settings_id_seq' AND n.nspname = 'public'
  ) THEN
    CREATE SEQUENCE public.app_settings_id_seq;
  END IF;
END $$;

SELECT setval(
  'public.app_settings_id_seq',
  GREATEST(COALESCE((SELECT MAX(id) FROM public.app_settings), 1), 1)
);

ALTER TABLE public.app_settings
  ALTER COLUMN id SET DEFAULT nextval('public.app_settings_id_seq');
ALTER SEQUENCE public.app_settings_id_seq OWNED BY public.app_settings.id;

-- -----------------------------------------------------------------------------
-- 1) Columns (only when table exists)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'account_types', 'cash_types', 'bank_details', 'app_settings',
    'accounts', 'transactions', 'file_attachments', 'short_links', 'ledger_shares'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'Skip user_id column — %.% missing', 'public', t;
      CONTINUE;
    END IF;
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE',
      t
    );
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 2) Backfill to oldest auth user (current operator keeps existing books)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  owner_id UUID;
  t TEXT;
BEGIN
  SELECT id INTO owner_id FROM auth.users ORDER BY created_at ASC NULLS LAST LIMIT 1;
  IF owner_id IS NULL THEN
    RAISE NOTICE 'No auth.users row found — skip backfill (empty project).';
    RETURN;
  END IF;

  FOREACH t IN ARRAY ARRAY[
    'account_types', 'cash_types', 'bank_details', 'app_settings',
    'accounts', 'transactions', 'file_attachments', 'short_links', 'ledger_shares'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format(
      'UPDATE public.%I SET user_id = $1 WHERE user_id IS NULL',
      t
    ) USING owner_id;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 3) NOT NULL where rows exist (safe when table empty or fully backfilled)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
  nulls BIGINT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'account_types', 'cash_types', 'app_settings', 'accounts', 'transactions'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE EXCEPTION 'Required table public.% is missing', t;
    END IF;
    EXECUTE format(
      'SELECT COUNT(*) FROM public.%I WHERE user_id IS NULL',
      t
    ) INTO nulls;
    IF nulls > 0 THEN
      RAISE EXCEPTION
        '% .user_id still null — create an auth user then re-run',
        t;
    END IF;
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN user_id SET NOT NULL', t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY[
    'bank_details', 'file_attachments', 'short_links', 'ledger_shares'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format(
      'SELECT COUNT(*) FROM public.%I WHERE user_id IS NULL',
      t
    ) INTO nulls;
    IF nulls = 0 THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN user_id SET NOT NULL', t);
    END IF;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 4) Unique constraints (per-user codes / one settings row per user)
-- -----------------------------------------------------------------------------
ALTER TABLE public.account_types DROP CONSTRAINT IF EXISTS account_types_code_unique;
ALTER TABLE public.cash_types DROP CONSTRAINT IF EXISTS cash_types_code_unique;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'account_types_user_id_code_unique'
  ) THEN
    ALTER TABLE public.account_types
      ADD CONSTRAINT account_types_user_id_code_unique UNIQUE (user_id, code);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cash_types_user_id_code_unique'
  ) THEN
    ALTER TABLE public.cash_types
      ADD CONSTRAINT cash_types_user_id_code_unique UNIQUE (user_id, code);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'app_settings_user_id_unique'
  ) THEN
    ALTER TABLE public.app_settings
      ADD CONSTRAINT app_settings_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'account_types', 'cash_types', 'bank_details', 'app_settings',
    'accounts', 'transactions', 'file_attachments', 'short_links', 'ledger_shares'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I (user_id)',
      'idx_' || t || '_user_id',
      t
    );
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 5) RLS: owner-only for authenticated; revoke open anon policies
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'account_types', 'cash_types', 'bank_details', 'app_settings',
    'accounts', 'transactions', 'file_attachments', 'short_links'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Allow anon read ' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Allow anon insert ' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Allow anon update ' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Allow anon delete ' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select_own', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_insert_own', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_update_own', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_delete_own', t);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (user_id = auth.uid())',
      t || '_select_own', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())',
      t || '_insert_own', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())',
      t || '_update_own', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (user_id = auth.uid())',
      t || '_delete_own', t
    );

    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT ALL ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;

-- ledger_shares: owner policies when table exists
DO $$
BEGIN
  IF to_regclass('public.ledger_shares') IS NULL THEN
    RETURN;
  END IF;
  DROP POLICY IF EXISTS ledger_shares_select_own ON public.ledger_shares;
  DROP POLICY IF EXISTS ledger_shares_insert_own ON public.ledger_shares;
  DROP POLICY IF EXISTS ledger_shares_update_own ON public.ledger_shares;
  DROP POLICY IF EXISTS ledger_shares_delete_own ON public.ledger_shares;
  CREATE POLICY ledger_shares_select_own
    ON public.ledger_shares FOR SELECT TO authenticated USING (user_id = auth.uid());
  CREATE POLICY ledger_shares_insert_own
    ON public.ledger_shares FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
  CREATE POLICY ledger_shares_update_own
    ON public.ledger_shares FOR UPDATE TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  CREATE POLICY ledger_shares_delete_own
    ON public.ledger_shares FOR DELETE TO authenticated USING (user_id = auth.uid());
  GRANT ALL ON public.ledger_shares TO authenticated;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'S'
      AND c.relname = 'transactions_entry_number_seq'
      AND n.nspname = 'public'
  ) THEN
    GRANT USAGE, SELECT ON SEQUENCE public.transactions_entry_number_seq
      TO authenticated, service_role;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 6) RPCs scoped by p_user_id (service role / app pass the session user id)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_get_app_settings(p_user_id UUID)
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
        'user_id', s.user_id,
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
      WHERE s.user_id = p_user_id
      LIMIT 1
    ),
    'null'::jsonb
  );
$$;

CREATE OR REPLACE FUNCTION public.rpc_list_account_types(p_user_id UUID)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'code', t.code,
        'description', t.description,
        'active', t.active,
        'created_at', t.created_at
      )
      ORDER BY t.created_at ASC, t.name ASC
    ),
    '[]'::jsonb
  )
  FROM public.account_types t
  WHERE t.user_id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.rpc_list_cash_types(p_user_id UUID)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'code', t.code,
        'description', t.description,
        'active', t.active,
        'created_at', t.created_at
      )
      ORDER BY t.created_at ASC, t.name ASC
    ),
    '[]'::jsonb
  )
  FROM public.cash_types t
  WHERE t.user_id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.rpc_list_accounts(p_user_id UUID)
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
          WHERE t.account_id = a.id AND t.user_id = p_user_id
        ), 0)
      )
      ORDER BY a.created_at ASC, a.name ASC
    ),
    '[]'::jsonb
  )
  FROM public.accounts a
  JOIN public.account_types at ON at.id = a.account_type_id
  JOIN public.cash_types ct ON ct.id = a.cash_type_id
  WHERE a.user_id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.rpc_list_transactions(p_user_id UUID)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'entry_number', t.entry_number,
        'transaction_date', t.transaction_date,
        'account_id', t.account_id,
        'account_name', a.name,
        'narration', COALESCE(t.narration, ''),
        'entry_type', COALESCE(t.entry_type, 'credit'),
        'balance', t.balance,
        'created_at', t.created_at
      )
      ORDER BY t.entry_number DESC
    ),
    '[]'::jsonb
  )
  FROM public.transactions t
  JOIN public.accounts a ON a.id = t.account_id
  WHERE t.user_id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.rpc_list_bank_details(p_user_id UUID)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', b.id,
        'bank_name', b.bank_name,
        'account_title', b.account_title,
        'account_number', b.account_number,
        'iban', b.iban,
        'branch_name', b.branch_name,
        'branch_code', b.branch_code,
        'swift_code', b.swift_code,
        'notes', b.notes,
        'qr_code_url', b.qr_code_url,
        'active', b.active,
        'created_at', b.created_at
      )
      ORDER BY b.created_at ASC
    ),
    '[]'::jsonb
  )
  FROM public.bank_details b
  WHERE b.user_id = p_user_id;
$$;

-- Drop old zero-arg overloads so PostgREST does not keep returning unscoped data
DROP FUNCTION IF EXISTS public.rpc_get_app_settings();
DROP FUNCTION IF EXISTS public.rpc_list_account_types();
DROP FUNCTION IF EXISTS public.rpc_list_cash_types();
DROP FUNCTION IF EXISTS public.rpc_list_accounts();
DROP FUNCTION IF EXISTS public.rpc_list_transactions();
DROP FUNCTION IF EXISTS public.rpc_list_bank_details();

GRANT EXECUTE ON FUNCTION public.rpc_get_app_settings(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_list_account_types(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_list_cash_types(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_list_accounts(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_list_transactions(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_list_bank_details(UUID) TO authenticated, service_role;
