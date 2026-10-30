-- =============================================================================
-- Migration: First-party short links (no TinyURL ads)
-- Date: 2026-10-30
--
-- Run in Supabase → SQL Editor. Safe to re-run.
-- Enables ad-free /l/{code} redirects for ledger WhatsApp links.
-- =============================================================================

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
