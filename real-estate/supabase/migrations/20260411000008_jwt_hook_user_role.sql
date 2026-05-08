-- JWT hook: 'role' -> 'user_role' болгох
-- PostgREST 'role' claim-г SET ROLE-д ашигладаг тул reserved.
-- Манай app-ийн role-ийг 'user_role' claim-д хадгална.

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims jsonb;
  v_role text;
  v_tenant_id text;
BEGIN
  SELECT u.role::text, u.tenant_id::text
  INTO v_role, v_tenant_id
  FROM public.users u
  WHERE u.id = (event ->> 'user_id')::uuid;

  claims := event -> 'claims';

  -- 'role' биш 'user_role' хэрэглэ — PostgREST-д reserved
  claims := jsonb_set(claims, '{user_role}', to_jsonb(COALESCE(v_role, 'buyer')));

  IF v_tenant_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(v_tenant_id));
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);

EXCEPTION WHEN OTHERS THEN
  RETURN event;
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- RLS helper функц: 'user_role' claim унших
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(auth.jwt() ->> 'user_role', 'anonymous');
$$;
