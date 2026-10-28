-- =============================================================================
-- File attachments metadata (bytes live on Cloudflare R2)
-- =============================================================================
-- Run in Supabase → SQL Editor (safe to re-run).
-- Pattern: R2 holds the file; this table holds storage_key + public_url + size.
-- =============================================================================

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
