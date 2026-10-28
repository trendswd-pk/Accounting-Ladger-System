-- =============================================================================
-- Accounting Ledger System — core schema
-- =============================================================================
-- Run in Supabase → SQL Editor (safe to re-run).
-- Tables: account_types, cash_types, app_settings
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Account types (Settings → Account Type)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Cash types (Settings → Cash Type)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- App settings (single-row profile: business name, currency, theme)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  business_name TEXT NOT NULL DEFAULT 'My Business',
  currency TEXT NOT NULL DEFAULT 'PKR',
  theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('light', 'dark')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

-- ---------------------------------------------------------------------------
-- Seed defaults (only when empty)
-- ---------------------------------------------------------------------------
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
-- RPCs — one DB round-trip per read (also in rpcs.sql for standalone re-runs)
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

GRANT EXECUTE ON FUNCTION public.rpc_get_app_settings() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_list_account_types() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_list_cash_types() TO anon, authenticated, service_role;

-- #############################################################################
-- File attachments — metadata only (bytes on Cloudflare R2)
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
-- Accounts (also in accounts.sql for standalone runs)
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
        'created_at', a.created_at
      )
      ORDER BY a.created_at ASC, a.name ASC
    ),
    '[]'::jsonb
  )
  FROM public.accounts a
  JOIN public.account_types at ON at.id = a.account_type_id
  JOIN public.cash_types ct ON ct.id = a.cash_type_id;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_list_accounts() TO anon, authenticated, service_role;
