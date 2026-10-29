-- =============================================================================
-- Clear ALL transactions only (accounts / types / settings stay)
-- =============================================================================
-- Run in Supabase SQL Editor when you want to wipe dummy/test ledger entries.
-- IRREVERSIBLE. Does NOT delete accounts.
-- entry_number sequence is reset so SR. starts from 1 again.
-- =============================================================================

TRUNCATE TABLE public.transactions RESTART IDENTITY CASCADE;

-- Optional verify:
-- SELECT COUNT(*) AS remaining_transactions FROM public.transactions;
