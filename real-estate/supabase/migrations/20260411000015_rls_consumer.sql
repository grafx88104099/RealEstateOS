-- RLS policies: buyer + seller → consumer

-- Drop old role-specific policies
DROP POLICY IF EXISTS users_select_seller_self ON public.users;
DROP POLICY IF EXISTS users_update_seller_self ON public.users;
DROP POLICY IF EXISTS users_select_buyer_self ON public.users;
DROP POLICY IF EXISTS users_update_buyer_self ON public.users;
DROP POLICY IF EXISTS listings_select_seller ON public.listings;
DROP POLICY IF EXISTS listings_insert_seller ON public.listings;
DROP POLICY IF EXISTS listings_update_seller ON public.listings;
DROP POLICY IF EXISTS listing_images_select_seller ON public.listing_images;
DROP POLICY IF EXISTS listing_images_insert_seller ON public.listing_images;
DROP POLICY IF EXISTS listing_images_delete_seller ON public.listing_images;
DROP POLICY IF EXISTS inquiries_insert_buyer ON public.inquiries;
DROP POLICY IF EXISTS inquiries_select_buyer ON public.inquiries;

-- Consumer: view/update own user row
CREATE POLICY users_select_consumer_self ON public.users
  FOR SELECT TO authenticated
  USING (public.get_user_role() = 'consumer' AND id = auth.uid());

CREATE POLICY users_update_consumer_self ON public.users
  FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'consumer' AND id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = 'consumer');

-- Consumer: view/create own listings (as seller)
CREATE POLICY listings_select_consumer ON public.listings
  FOR SELECT TO authenticated
  USING (public.get_user_role() = 'consumer' AND seller_id = auth.uid());

CREATE POLICY listings_insert_consumer ON public.listings
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() = 'consumer' AND seller_id = auth.uid());

CREATE POLICY listings_update_consumer ON public.listings
  FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'consumer' AND seller_id = auth.uid())
  WITH CHECK (public.get_user_role() = 'consumer' AND seller_id = auth.uid());

-- Consumer: listing images for own listings
CREATE POLICY listing_images_select_consumer ON public.listing_images
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'consumer'
    AND EXISTS (
      SELECT 1 FROM public.listings
      WHERE id = listing_images.listing_id AND seller_id = auth.uid()
    )
  );

CREATE POLICY listing_images_insert_consumer ON public.listing_images
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() = 'consumer'
    AND EXISTS (
      SELECT 1 FROM public.listings
      WHERE id = listing_images.listing_id AND seller_id = auth.uid()
    )
  );

CREATE POLICY listing_images_delete_consumer ON public.listing_images
  FOR DELETE TO authenticated
  USING (
    public.get_user_role() = 'consumer'
    AND EXISTS (
      SELECT 1 FROM public.listings
      WHERE id = listing_images.listing_id AND seller_id = auth.uid()
    )
  );

-- Consumer: create and view own inquiries (as buyer)
CREATE POLICY inquiries_insert_consumer ON public.inquiries
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() = 'consumer'
    AND buyer_id = auth.uid()
  );

CREATE POLICY inquiries_select_consumer ON public.inquiries
  FOR SELECT TO authenticated
  USING (public.get_user_role() = 'consumer' AND buyer_id = auth.uid());

-- Update tenant_admin invite policy to allow consumer role
DROP POLICY IF EXISTS users_insert_tenant_admin ON public.users;
CREATE POLICY users_insert_tenant_admin ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() = 'tenant_admin'
    AND tenant_id = public.get_tenant_id()
    AND role IN ('tenant_admin', 'agent', 'consumer')
  );

-- Update tenant_admin update policy
DROP POLICY IF EXISTS users_update_tenant_admin ON public.users;
CREATE POLICY users_update_tenant_admin ON public.users
  FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'tenant_admin' AND tenant_id = public.get_tenant_id())
  WITH CHECK (tenant_id = public.get_tenant_id() AND role IN ('tenant_admin', 'agent', 'consumer'));

-- Fix buyer_preferences: uses wrong 'role' claim, should be 'user_role'
-- Also update agent/admin policy to use user_role
DROP POLICY IF EXISTS "Agents can view tenant preferences" ON public.buyer_preferences;

CREATE POLICY "Agents can view tenant preferences"
  ON public.buyer_preferences FOR SELECT
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (auth.jwt() ->> 'user_role') IN ('agent', 'tenant_admin', 'super_admin')
  );
