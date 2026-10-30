-- =============================================================================
-- Accounting Ledger System — FULL DATABASE SCHEMA (single file)
-- =============================================================================
-- Run once in Supabase → SQL Editor (safe to re-run).
-- Covers: types, settings, accounts, transactions, file metadata, RPCs, seeds.
--
-- Storage split:
--   • Database  = rows + file metadata (file_attachments)
--   • Cloudflare R2 = file bytes
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- #############################################################################
-- 1) Account types
-- #############################################################################

CREATE TABLE IF NOT EXISTS public.account_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT account_types_code_unique UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_account_types_created_at
  ON public.account_types (created_at);

ALTER TABLE public.account_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read account_types" ON public.account_types;
DROP POLICY IF EXISTS "Allow anon insert account_types" ON public.account_types;
DROP POLICY IF EXISTS "Allow anon update account_types" ON public.account_types;
DROP POLICY IF EXISTS "Allow anon delete account_types" ON public.account_types;

CREATE POLICY "Allow anon read account_types"
  ON public.account_types FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert account_types"
  ON public.account_types FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update account_types"
  ON public.account_types FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete account_types"
  ON public.account_types FOR DELETE TO anon USING (true);

GRANT ALL ON public.account_types TO anon;
GRANT ALL ON public.account_types TO service_role;

-- #############################################################################
-- 2) Cash types
-- #############################################################################

CREATE TABLE IF NOT EXISTS public.cash_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cash_types_code_unique UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_cash_types_created_at
  ON public.cash_types (created_at);

ALTER TABLE public.cash_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read cash_types" ON public.cash_types;
DROP POLICY IF EXISTS "Allow anon insert cash_types" ON public.cash_types;
DROP POLICY IF EXISTS "Allow anon update cash_types" ON public.cash_types;
DROP POLICY IF EXISTS "Allow anon delete cash_types" ON public.cash_types;

CREATE POLICY "Allow anon read cash_types"
  ON public.cash_types FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert cash_types"
  ON public.cash_types FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update cash_types"
  ON public.cash_types FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete cash_types"
  ON public.cash_types FOR DELETE TO anon USING (true);

GRANT ALL ON public.cash_types TO anon;
GRANT ALL ON public.cash_types TO service_role;

-- #############################################################################
-- 3) App settings (single row id = 1)
-- #############################################################################

CREATE TABLE IF NOT EXISTS public.app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  business_name TEXT NOT NULL DEFAULT 'My Business',
  currency TEXT NOT NULL DEFAULT 'PKR',
  theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('light', 'dark')),
  default_entry_mode TEXT NOT NULL DEFAULT 'normal'
    CHECK (default_entry_mode IN ('normal', 'transfer')),
  logo_url TEXT,
  favicon_url TEXT,
  account_message_template TEXT NOT NULL DEFAULT '',
  transaction_message_template TEXT NOT NULL DEFAULT '',
  message_note_plus TEXT NOT NULL DEFAULT
    'Plus (+) balance: payment receivable — they will pay you.',
  message_note_minus TEXT NOT NULL DEFAULT
    'Minus (−) balance: payment payable — you will pay them.',
  message_note_zero TEXT NOT NULL DEFAULT
    'Zero balance: everything is settled / all clear.',
  account_message_include_ledger_url BOOLEAN NOT NULL DEFAULT true,
  transaction_message_include_pdf_url BOOLEAN NOT NULL DEFAULT true,
  transaction_message_include_ledger_url BOOLEAN NOT NULL DEFAULT true,
  cash_savings_cash_type_ids UUID[] NOT NULL DEFAULT '{}',
  cash_savings_account_type_ids UUID[] NOT NULL DEFAULT '{}',
  payable_receivable_cash_type_ids UUID[] NOT NULL DEFAULT '{}',
  payable_receivable_account_type_ids UUID[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotent column adds (existing DBs)
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS default_entry_mode TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS favicon_url TEXT;
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
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS account_message_include_ledger_url BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS transaction_message_include_pdf_url BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS transaction_message_include_ledger_url BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS cash_savings_cash_type_ids UUID[] NOT NULL DEFAULT '{}';
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS cash_savings_account_type_ids UUID[] NOT NULL DEFAULT '{}';
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS payable_receivable_cash_type_ids UUID[] NOT NULL DEFAULT '{}';
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS payable_receivable_account_type_ids UUID[] NOT NULL DEFAULT '{}';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'app_settings_default_entry_mode_check'
  ) THEN
    ALTER TABLE public.app_settings
      ADD CONSTRAINT app_settings_default_entry_mode_check
      CHECK (default_entry_mode IN ('normal', 'transfer'));
  END IF;
END $$;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Allow anon update app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Allow anon insert app_settings" ON public.app_settings;

CREATE POLICY "Allow anon read app_settings"
  ON public.app_settings FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert app_settings"
  ON public.app_settings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update app_settings"
  ON public.app_settings FOR UPDATE TO anon USING (true) WITH CHECK (true);

GRANT ALL ON public.app_settings TO anon;
GRANT ALL ON public.app_settings TO service_role;

INSERT INTO public.app_settings (id, business_name, currency, theme)
VALUES (1, 'My Business', 'PKR', 'dark')
ON CONFLICT (id) DO NOTHING;

-- Seed message notes / templates when empty
UPDATE public.app_settings
SET message_note_plus = 'Plus (+) balance: payment receivable — they will pay you.'
WHERE id = 1 AND COALESCE(TRIM(message_note_plus), '') = '';

UPDATE public.app_settings
SET message_note_minus = 'Minus (−) balance: payment payable — you will pay them.'
WHERE id = 1 AND COALESCE(TRIM(message_note_minus), '') = '';

UPDATE public.app_settings
SET message_note_zero = 'Zero balance: everything is settled / all clear.'
WHERE id = 1 AND COALESCE(TRIM(message_note_zero), '') = '';

UPDATE public.app_settings
SET account_message_template = $msg$Account Balance Details
--------------------------
Account: {{name}}
Phone: {{phone}}
Current Balance: {{balance}}

Note: {{note}}

Ledger: {{ledger_url}}$msg$
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

-- #############################################################################
-- 4) Accounts
-- #############################################################################

CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  account_type_id UUID NOT NULL REFERENCES public.account_types (id) ON DELETE RESTRICT,
  cash_type_id UUID NOT NULL REFERENCES public.cash_types (id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accounts_created_at ON public.accounts (created_at ASC);
CREATE INDEX IF NOT EXISTS idx_accounts_account_type_id ON public.accounts (account_type_id);
CREATE INDEX IF NOT EXISTS idx_accounts_cash_type_id ON public.accounts (cash_type_id);
CREATE INDEX IF NOT EXISTS idx_accounts_name ON public.accounts (name);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read accounts" ON public.accounts;
DROP POLICY IF EXISTS "Allow anon insert accounts" ON public.accounts;
DROP POLICY IF EXISTS "Allow anon update accounts" ON public.accounts;
DROP POLICY IF EXISTS "Allow anon delete accounts" ON public.accounts;

CREATE POLICY "Allow anon read accounts"
  ON public.accounts FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert accounts"
  ON public.accounts FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update accounts"
  ON public.accounts FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete accounts"
  ON public.accounts FOR DELETE TO anon USING (true);

GRANT ALL ON public.accounts TO anon;
GRANT ALL ON public.accounts TO service_role;

-- #############################################################################
-- 5) Transactions
-- #############################################################################

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number BIGSERIAL UNIQUE,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  account_id UUID NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  entry_type TEXT NOT NULL DEFAULT 'credit'
    CHECK (entry_type IN ('credit', 'debit')),
  narration TEXT NOT NULL DEFAULT '',
  balance NUMERIC(18, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS entry_type TEXT NOT NULL DEFAULT 'credit';
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS narration TEXT NOT NULL DEFAULT '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transactions_entry_type_check'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_entry_type_check
      CHECK (entry_type IN ('credit', 'debit'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_date
  ON public.transactions (transaction_date DESC, entry_number DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id
  ON public.transactions (account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_entry_number
  ON public.transactions (entry_number);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow anon insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow anon update transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow anon delete transactions" ON public.transactions;

CREATE POLICY "Allow anon read transactions"
  ON public.transactions FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert transactions"
  ON public.transactions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update transactions"
  ON public.transactions FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete transactions"
  ON public.transactions FOR DELETE TO anon USING (true);

GRANT ALL ON public.transactions TO anon;
GRANT ALL ON public.transactions TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.transactions_entry_number_seq TO anon, service_role;

-- #############################################################################
-- 6) File attachments (metadata only — bytes on R2)
-- #############################################################################

CREATE TABLE IF NOT EXISTS public.file_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_key TEXT NOT NULL,
  public_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes BIGINT NOT NULL DEFAULT 0,
  folder TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT file_attachments_storage_key_unique UNIQUE (storage_key)
);

CREATE INDEX IF NOT EXISTS idx_file_attachments_created_at
  ON public.file_attachments (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_attachments_folder
  ON public.file_attachments (folder);

ALTER TABLE public.file_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read file_attachments" ON public.file_attachments;
DROP POLICY IF EXISTS "Allow anon insert file_attachments" ON public.file_attachments;
DROP POLICY IF EXISTS "Allow anon update file_attachments" ON public.file_attachments;
DROP POLICY IF EXISTS "Allow anon delete file_attachments" ON public.file_attachments;

CREATE POLICY "Allow anon read file_attachments"
  ON public.file_attachments FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert file_attachments"
  ON public.file_attachments FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update file_attachments"
  ON public.file_attachments FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete file_attachments"
  ON public.file_attachments FOR DELETE TO anon USING (true);

GRANT ALL ON public.file_attachments TO anon;
GRANT ALL ON public.file_attachments TO service_role;

-- #############################################################################
-- 6b) Short links (ad-free redirects for WhatsApp / share)
-- #############################################################################

CREATE TABLE IF NOT EXISTS public.short_links (
  code TEXT PRIMARY KEY,
  target_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_short_links_created_at
  ON public.short_links (created_at DESC);

ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read short_links" ON public.short_links;
DROP POLICY IF EXISTS "Allow anon insert short_links" ON public.short_links;

CREATE POLICY "Allow anon read short_links"
  ON public.short_links FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert short_links"
  ON public.short_links FOR INSERT TO anon WITH CHECK (true);

GRANT ALL ON public.short_links TO anon;
GRANT ALL ON public.short_links TO service_role;

-- #############################################################################
-- 7) Seeds (only when empty)
-- #############################################################################

INSERT INTO public.account_types (name, code, description, active)
SELECT s.name, s.code, s.description, true
FROM (
  VALUES
    ('Asset', 'AST', 'Resources owned by the business'),
    ('Liability', 'LIA', 'Amounts owed to others'),
    ('Equity', 'EQT', 'Owner capital and retained earnings'),
    ('Income', 'INC', 'Revenue and other income'),
    ('Expense', 'EXP', 'Operating and other expenses')
) AS s(name, code, description)
WHERE NOT EXISTS (SELECT 1 FROM public.account_types LIMIT 1);

INSERT INTO public.cash_types (name, code, description, active)
SELECT s.name, s.code, s.description, true
FROM (
  VALUES
    ('Cash', 'CASH', 'Physical cash on hand'),
    ('Bank', 'BANK', 'Bank current / savings accounts'),
    ('Petty Cash', 'PETTY', 'Small day-to-day cash float')
) AS s(name, code, description)
WHERE NOT EXISTS (SELECT 1 FROM public.cash_types LIMIT 1);

-- #############################################################################
-- 8) RPCs (one round-trip reads)
-- #############################################################################

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
      'transaction_message_include_ledger_url', true,
      'cash_savings_cash_type_ids', '[]'::jsonb,
      'cash_savings_account_type_ids', '[]'::jsonb,
      'payable_receivable_cash_type_ids', '[]'::jsonb,
      'payable_receivable_account_type_ids', '[]'::jsonb,
      'updated_at', now()
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.rpc_list_account_types()
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
  FROM public.account_types t;
$$;

CREATE OR REPLACE FUNCTION public.rpc_list_cash_types()
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
  FROM public.cash_types t;
$$;

CREATE OR REPLACE FUNCTION public.rpc_list_accounts()
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
          WHERE t.account_id = a.id
        ), 0)
      )
      ORDER BY a.created_at ASC, a.name ASC
    ),
    '[]'::jsonb
  )
  FROM public.accounts a
  JOIN public.account_types at ON at.id = a.account_type_id
  JOIN public.cash_types ct ON ct.id = a.cash_type_id;
$$;

CREATE OR REPLACE FUNCTION public.rpc_list_transactions()
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
  JOIN public.accounts a ON a.id = t.account_id;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_get_app_settings() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_list_account_types() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_list_cash_types() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_list_accounts() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_list_transactions() TO anon, authenticated, service_role;

-- =============================================================================
-- OPTIONAL (do NOT run with schema install): clear all transactions only
-- =============================================================================
-- TRUNCATE TABLE public.transactions RESTART IDENTITY CASCADE;
-- =============================================================================
