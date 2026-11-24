-- =============================================================================
-- New-user default seed (Account Types, Cash Types, Bank, starter Accounts)
-- Run in Supabase → SQL Editor (idempotent).
--
-- App signup already seeds via /api/auth/bootstrap (lib/userBootstrap.ts).
-- This SQL mirrors the same defaults as a callable function for support / fixes.
--
-- Usage (replace the UUID with auth.users.id):
--   SELECT public.seed_new_user_ledger(
--     'bfc768d3-b04a-405d-bf1e-ab73b4ac02d0'::uuid,
--     'ShaPosh'
--   );
-- =============================================================================

CREATE OR REPLACE FUNCTION public.seed_new_user_ledger(
  p_user_id UUID,
  p_business_name TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business TEXT := NULLIF(TRIM(COALESCE(p_business_name, '')), '');
  v_at_cih UUID;
  v_at_bnk UUID;
  v_at_exp UUID;
  v_at_sav UUID;
  v_at_inv UUID;
  v_ct_cih UUID;
  v_ct_exp UUID;
  v_ct_own UUID;
  v_ct_sav UUID;
  v_ct_inv UUID;
  v_created_settings BOOLEAN := false;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'auth.users row not found for %', p_user_id;
  END IF;

  IF v_business IS NULL THEN
    v_business := COALESCE(
      NULLIF(TRIM(COALESCE((SELECT raw_user_meta_data->>'business_name' FROM auth.users WHERE id = p_user_id), '')), ''),
      'My Business'
    );
  END IF;

  -- Settings (one row per user)
  IF NOT EXISTS (SELECT 1 FROM public.app_settings WHERE user_id = p_user_id) THEN
    INSERT INTO public.app_settings (user_id, business_name, currency, theme, default_entry_mode)
    VALUES (p_user_id, v_business, 'PKR', 'dark', 'normal');
    v_created_settings := true;
  ELSIF v_business IS NOT NULL THEN
    UPDATE public.app_settings
    SET business_name = v_business,
        updated_at = now()
    WHERE user_id = p_user_id
      AND (
        COALESCE(TRIM(business_name), '') = ''
        OR LOWER(TRIM(business_name)) = 'trends wd'
      );
  END IF;

  -- Account types: insert any missing codes (keeps older AST/LIA rows if present)
  INSERT INTO public.account_types (user_id, name, code, description, active)
  SELECT p_user_id, v.name, v.code, v.description, true
  FROM (
    VALUES
      ('Cash in Hand', 'CIH', 'Physical cash held by the business'),
      ('Bank', 'BNK', 'Bank current and savings accounts'),
      ('Expenses', 'EXP', 'Operating and other expenses'),
      ('Savings', 'SAV', 'Saved funds and reserves'),
      ('Investment', 'INV', 'Investments and portfolios')
  ) AS v(name, code, description)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.account_types t
    WHERE t.user_id = p_user_id AND t.code = v.code
  );

  -- Cash types: insert any missing codes
  INSERT INTO public.cash_types (user_id, name, code, description, active)
  SELECT p_user_id, v.name, v.code, v.description, true
  FROM (
    VALUES
      ('Cash in Hand', 'CIH', 'Cash available in hand / pocket'),
      ('Expenses', 'EXP', 'Cash used for expenses'),
      ('Owned Cash', 'OWN', 'Owned / business cash balance'),
      ('Savings', 'SAV', 'Saved cash'),
      ('Investment', 'INV', 'Cash tied in investments')
  ) AS v(name, code, description)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.cash_types t
    WHERE t.user_id = p_user_id AND t.code = v.code
  );

  SELECT id INTO v_at_cih FROM public.account_types WHERE user_id = p_user_id AND code = 'CIH' LIMIT 1;
  SELECT id INTO v_at_bnk FROM public.account_types WHERE user_id = p_user_id AND code = 'BNK' LIMIT 1;
  SELECT id INTO v_at_exp FROM public.account_types WHERE user_id = p_user_id AND code = 'EXP' LIMIT 1;
  SELECT id INTO v_at_sav FROM public.account_types WHERE user_id = p_user_id AND code = 'SAV' LIMIT 1;
  SELECT id INTO v_at_inv FROM public.account_types WHERE user_id = p_user_id AND code = 'INV' LIMIT 1;

  SELECT id INTO v_ct_cih FROM public.cash_types WHERE user_id = p_user_id AND code = 'CIH' LIMIT 1;
  SELECT id INTO v_ct_exp FROM public.cash_types WHERE user_id = p_user_id AND code = 'EXP' LIMIT 1;
  SELECT id INTO v_ct_own FROM public.cash_types WHERE user_id = p_user_id AND code = 'OWN' LIMIT 1;
  SELECT id INTO v_ct_sav FROM public.cash_types WHERE user_id = p_user_id AND code = 'SAV' LIMIT 1;
  SELECT id INTO v_ct_inv FROM public.cash_types WHERE user_id = p_user_id AND code = 'INV' LIMIT 1;

  IF v_at_cih IS NULL OR v_at_bnk IS NULL OR v_at_exp IS NULL OR v_at_sav IS NULL OR v_at_inv IS NULL
     OR v_ct_cih IS NULL OR v_ct_exp IS NULL OR v_ct_own IS NULL OR v_ct_sav IS NULL OR v_ct_inv IS NULL
  THEN
    RAISE EXCEPTION 'Default account/cash type codes still missing for user %', p_user_id;
  END IF;

  -- Dummy bank detail
  IF NOT EXISTS (SELECT 1 FROM public.bank_details WHERE user_id = p_user_id) THEN
    INSERT INTO public.bank_details (
      user_id, bank_name, account_title, account_number, iban,
      branch_name, branch_code, swift_code, notes, active
    ) VALUES (
      p_user_id,
      'Demo Bank',
      v_business,
      '0001234567890',
      'PK00DEMO0000000001234567890',
      'Main Branch',
      '0001',
      'DEMOPKKA',
      'Sample bank detail — edit or replace in Settings → Bank details.',
      true
    );
  END IF;

  -- Starter accounts (only when this user has none yet)
  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE user_id = p_user_id) THEN
    INSERT INTO public.accounts (
      user_id, name, phone, account_type_id, cash_type_id
    ) VALUES
      (p_user_id, 'Cash in Pocket', '', v_at_cih, v_ct_cih),
      (p_user_id, 'Bank Account', '', v_at_bnk, v_ct_own),
      (p_user_id, 'Savings', '', v_at_sav, v_ct_sav),
      (p_user_id, 'Investment', '', v_at_inv, v_ct_inv),
      (p_user_id, 'Daily Expenses', '', v_at_exp, v_ct_exp),
      (p_user_id, 'Loan Payable', '', v_at_bnk, v_ct_own),
      (p_user_id, 'Loan Receivable', '', v_at_cih, v_ct_own);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'user_id', p_user_id,
    'business_name', v_business,
    'created_settings', v_created_settings
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_new_user_ledger(UUID, TEXT)
  TO authenticated, service_role;
