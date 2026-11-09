-- =============================================================================
-- Allow multiple file_attachments rows to share one R2 storage_key / public_url
-- (multi-transaction / transfer: upload once, attach same file to every entry).
-- Run in Supabase → SQL Editor (idempotent).
-- =============================================================================

ALTER TABLE public.file_attachments
  DROP CONSTRAINT IF EXISTS file_attachments_storage_key_unique;

CREATE INDEX IF NOT EXISTS idx_file_attachments_storage_key
  ON public.file_attachments (storage_key);

CREATE INDEX IF NOT EXISTS idx_file_attachments_public_url
  ON public.file_attachments (public_url);
