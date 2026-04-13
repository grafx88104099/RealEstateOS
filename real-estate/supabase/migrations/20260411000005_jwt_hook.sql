-- Custom Access Token Hook
-- JWT-д tenant_id болон role автоматаар орно

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  v_role text;
  v_tenant_id uuid;
BEGIN
  SELECT u.role::text, u.tenant_id
  INTO v_role, v_tenant_id
  FROM public.users u
  WHERE u.id = (event ->> 'user_id')::uuid;

  claims := event -> 'claims';
  claims := jsonb_set(claims, '{role}',     to_jsonb(COALESCE(v_role, 'buyer')));
  claims := jsonb_set(claims, '{tenant_id}',to_jsonb(COALESCE(v_tenant_id::text, '')));

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
