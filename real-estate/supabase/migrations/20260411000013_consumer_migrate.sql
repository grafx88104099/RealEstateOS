-- Migration part 2: Migrate buyer + seller → consumer, update hook
-- Runs after part 1 is committed so 'consumer' enum value is available

-- Migrate existing records
UPDATE public.users SET role = 'consumer' WHERE role IN ('buyer', 'seller');

-- Update column default
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'consumer';

-- Update JWT hook — consumer replaces buyer as default fallback
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims   jsonb;
  v_role   text;
  v_tenant uuid;
BEGIN
  claims := event -> 'claims';

  SELECT role::text, tenant_id
  INTO v_role, v_tenant
  FROM public.users
  WHERE id = (event ->> 'user_id')::uuid;

  claims := jsonb_set(claims, '{user_role}', to_jsonb(COALESCE(v_role, 'consumer')));
  claims := jsonb_set(claims, '{tenant_id}', COALESCE(to_jsonb(v_tenant), 'null'::jsonb));

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
