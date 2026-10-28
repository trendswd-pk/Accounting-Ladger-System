-- =============================================================================
-- Accounting Ledger — list/get RPCs (one DB round-trip per read)
-- =============================================================================
-- Run in Supabase → SQL Editor after schema.sql (safe to re-run).
-- API routes call these via service role instead of multi-step table scans.
-- =============================================================================

-- App settings (single row)
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

-- Account types list (ordered)
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

-- Cash types list (ordered)
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
