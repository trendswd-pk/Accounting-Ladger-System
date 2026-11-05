-- =============================================================================
-- Bank details: QR code image URL
-- Run in Supabase → SQL Editor after 2026-11-05_bank_details.sql (idempotent).
-- =============================================================================

ALTER TABLE public.bank_details
  ADD COLUMN IF NOT EXISTS qr_code_url TEXT;

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
        'qr_code_url', b.qr_code_url,
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
