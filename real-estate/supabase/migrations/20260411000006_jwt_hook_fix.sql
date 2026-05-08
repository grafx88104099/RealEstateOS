-- JWT Hook засвар: public.users-д байхгүй хэрэглэгчийг зөв боловсруулна

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  v_role text;
  v_tenant_id text;
BEGIN
  -- public.users-д байхгүй бол NULL буцаана (шинэ хэрэглэгч)
  SELECT u.role::text, u.tenant_id::text
  INTO v_role, v_tenant_id
  FROM public.users u
  WHERE u.id = (event ->> 'user_id')::uuid;

  claims := event -> 'claims';

  -- Зөвхөн утга байвал claims-д нэмнэ
  claims := jsonb_set(claims, '{role}', to_jsonb(COALESCE(v_role, 'buyer')));

  IF v_tenant_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(v_tenant_id));
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);

EXCEPTION WHEN OTHERS THEN
  -- Ямар ч алдаа гарсан claims-г өөрчлөхгүйгээр буцаана
  RETURN event;
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
