-- =============================================================================
-- Bank details (Settings → Bank details)
-- Run in Supabase → SQL Editor (idempotent / safe to re-run).
-- =============================================================================

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
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_details_created_at
  ON public.bank_details (created_at);

CREATE INDEX IF NOT EXISTS idx_bank_details_active
  ON public.bank_details (active);

ALTER TABLE public.bank_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read bank_details" ON public.bank_details;
DROP POLICY IF EXISTS "Allow anon insert bank_details" ON public.bank_details;
DROP POLICY IF EXISTS "Allow anon update bank_details" ON public.bank_details;
DROP POLICY IF EXISTS "Allow anon delete bank_details" ON public.bank_details;

CREATE POLICY "Allow anon read bank_details"
  ON public.bank_details FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert bank_details"
  ON public.bank_details FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update bank_details"
  ON public.bank_details FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete bank_details"
  ON public.bank_details FOR DELETE TO anon USING (true);

GRANT ALL ON public.bank_details TO anon;
GRANT ALL ON public.bank_details TO service_role;

CREATE OR REPLACE FUNCTION public.rpc_list_bank_details()
RETURNS JSONB
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
        'iban', COALESCE(b.iban, ''),
        'branch_name', COALESCE(b.branch_name, ''),
        'branch_code', COALESCE(b.branch_code, ''),
        'swift_code', COALESCE(b.swift_code, ''),
        'notes', COALESCE(b.notes, ''),
        'active', b.active,
        'created_at', b.created_at
      )
      ORDER BY b.created_at ASC
    ),
    '[]'::jsonb
  )
  FROM public.bank_details b;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_list_bank_details() TO anon, authenticated, service_role;
