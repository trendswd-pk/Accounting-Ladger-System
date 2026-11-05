-- =============================================================================
-- Secure interactive ledger shares (PIN + expiry)
-- URL: /share/ledger/{token} — open with 4-digit code from WhatsApp message.
-- Run in Supabase → SQL Editor (idempotent).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ledger_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL,
  account_id UUID NOT NULL REFERENCES public.accounts (id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ledger_shares_token_unique UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS idx_ledger_shares_account_id
  ON public.ledger_shares (account_id);

CREATE INDEX IF NOT EXISTS idx_ledger_shares_expires_at
  ON public.ledger_shares (expires_at);

ALTER TABLE public.ledger_shares ENABLE ROW LEVEL SECURITY;

-- App uses service_role (admin client) for all access — no anon policies needed.
DROP POLICY IF EXISTS "Deny anon ledger_shares" ON public.ledger_shares;

GRANT ALL ON public.ledger_shares TO service_role;
-- Anon has no grants (unlock goes through Next.js API with admin key).
REVOKE ALL ON public.ledger_shares FROM anon;
REVOKE ALL ON public.ledger_shares FROM authenticated;
