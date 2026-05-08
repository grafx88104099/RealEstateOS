-- Platform tenant: consumer self-registration-д ашиглах
-- Fixed UUID-тай тул env var-аар reference хийж болно
INSERT INTO public.tenants (id, name, slug, subscription, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Platform',
  'platform',
  'free',
  true
)
ON CONFLICT (id) DO NOTHING;
