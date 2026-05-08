-- ============================================================================
-- RLS Policies for Multi-Tenant Real Estate Marketplace
-- Helper functions in public schema (auth schema is restricted in Supabase)
-- ============================================================================

-- ============================================================================
-- Helper functions (public schema)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_tenant_id()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'tenant_id')::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(auth.jwt() ->> 'role', 'anonymous');
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT public.get_user_role() = 'super_admin';
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_member(check_tenant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT public.is_super_admin() OR public.get_tenant_id() = check_tenant_id;
$$;

CREATE OR REPLACE FUNCTION public.has_role(allowed_roles text[])
RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT public.get_user_role() = ANY(allowed_roles);
$$;


-- ============================================================================
-- TENANTS
-- ============================================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenants_select_super_admin
  ON tenants FOR SELECT TO authenticated
  USING (public.is_super_admin());

CREATE POLICY tenants_insert_super_admin
  ON tenants FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());

CREATE POLICY tenants_update_super_admin
  ON tenants FOR UPDATE TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY tenants_delete_super_admin
  ON tenants FOR DELETE TO authenticated
  USING (public.is_super_admin());

CREATE POLICY tenants_select_tenant_admin
  ON tenants FOR SELECT TO authenticated
  USING (public.get_user_role() = 'tenant_admin' AND id = public.get_tenant_id());

CREATE POLICY tenants_select_member
  ON tenants FOR SELECT TO authenticated
  USING (public.has_role(ARRAY['agent', 'seller', 'buyer']) AND id = public.get_tenant_id());


-- ============================================================================
-- USERS
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select_super_admin
  ON users FOR SELECT TO authenticated
  USING (public.is_super_admin());

CREATE POLICY users_insert_super_admin
  ON users FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());

CREATE POLICY users_update_super_admin
  ON users FOR UPDATE TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY users_delete_super_admin
  ON users FOR DELETE TO authenticated
  USING (public.is_super_admin());

CREATE POLICY users_select_tenant_admin
  ON users FOR SELECT TO authenticated
  USING (public.get_user_role() = 'tenant_admin' AND tenant_id = public.get_tenant_id());

CREATE POLICY users_insert_tenant_admin
  ON users FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() = 'tenant_admin'
    AND tenant_id = public.get_tenant_id()
    AND role IN ('agent', 'seller', 'buyer')
  );

CREATE POLICY users_update_tenant_admin
  ON users FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'tenant_admin' AND tenant_id = public.get_tenant_id())
  WITH CHECK (tenant_id = public.get_tenant_id() AND role IN ('tenant_admin', 'agent', 'seller', 'buyer'));

CREATE POLICY users_select_agent_self
  ON users FOR SELECT TO authenticated
  USING (public.get_user_role() = 'agent' AND id = auth.uid());

CREATE POLICY users_update_agent_self
  ON users FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'agent' AND id = auth.uid())
  WITH CHECK (id = auth.uid() AND tenant_id = public.get_tenant_id() AND role = 'agent');

CREATE POLICY users_select_seller_self
  ON users FOR SELECT TO authenticated
  USING (public.get_user_role() = 'seller' AND id = auth.uid());

CREATE POLICY users_update_seller_self
  ON users FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'seller' AND id = auth.uid())
  WITH CHECK (id = auth.uid() AND tenant_id = public.get_tenant_id() AND role = 'seller');

CREATE POLICY users_select_buyer_self
  ON users FOR SELECT TO authenticated
  USING (public.get_user_role() = 'buyer' AND id = auth.uid());

CREATE POLICY users_update_buyer_self
  ON users FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'buyer' AND id = auth.uid())
  WITH CHECK (id = auth.uid() AND tenant_id = public.get_tenant_id() AND role = 'buyer');


-- ============================================================================
-- LISTINGS
-- ============================================================================

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY listings_select_public
  ON listings FOR SELECT TO anon, authenticated
  USING (status = 'active');

CREATE POLICY listings_select_super_admin
  ON listings FOR SELECT TO authenticated
  USING (public.is_super_admin());

CREATE POLICY listings_all_super_admin
  ON listings FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY listings_select_tenant_admin
  ON listings FOR SELECT TO authenticated
  USING (public.get_user_role() = 'tenant_admin' AND tenant_id = public.get_tenant_id());

CREATE POLICY listings_insert_tenant_admin
  ON listings FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() = 'tenant_admin' AND tenant_id = public.get_tenant_id());

CREATE POLICY listings_update_tenant_admin
  ON listings FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'tenant_admin' AND tenant_id = public.get_tenant_id())
  WITH CHECK (tenant_id = public.get_tenant_id());

CREATE POLICY listings_delete_tenant_admin
  ON listings FOR DELETE TO authenticated
  USING (public.get_user_role() = 'tenant_admin' AND tenant_id = public.get_tenant_id());

CREATE POLICY listings_select_agent
  ON listings FOR SELECT TO authenticated
  USING (public.get_user_role() = 'agent' AND tenant_id = public.get_tenant_id());

CREATE POLICY listings_insert_agent
  ON listings FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() = 'agent'
    AND tenant_id = public.get_tenant_id()
    AND agent_id = auth.uid()
  );

CREATE POLICY listings_update_agent
  ON listings FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'agent' AND tenant_id = public.get_tenant_id() AND agent_id = auth.uid())
  WITH CHECK (tenant_id = public.get_tenant_id() AND agent_id = auth.uid());

CREATE POLICY listings_select_seller
  ON listings FOR SELECT TO authenticated
  USING (public.get_user_role() = 'seller' AND agent_id = auth.uid());

CREATE POLICY listings_insert_seller
  ON listings FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() = 'seller' AND agent_id = auth.uid());

CREATE POLICY listings_update_seller
  ON listings FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'seller' AND agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());


-- ============================================================================
-- LISTING_IMAGES
-- ============================================================================

ALTER TABLE listing_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY listing_images_all_super_admin
  ON listing_images FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY listing_images_select_public
  ON listing_images FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_images.listing_id AND listings.status = 'active'
    )
  );

CREATE POLICY listing_images_select_tenant_admin
  ON listing_images FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'tenant_admin'
    AND EXISTS (SELECT 1 FROM listings WHERE listings.id = listing_images.listing_id AND listings.tenant_id = public.get_tenant_id())
  );

CREATE POLICY listing_images_insert_tenant_admin
  ON listing_images FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() = 'tenant_admin'
    AND EXISTS (SELECT 1 FROM listings WHERE listings.id = listing_images.listing_id AND listings.tenant_id = public.get_tenant_id())
  );

CREATE POLICY listing_images_update_tenant_admin
  ON listing_images FOR UPDATE TO authenticated
  USING (
    public.get_user_role() = 'tenant_admin'
    AND EXISTS (SELECT 1 FROM listings WHERE listings.id = listing_images.listing_id AND listings.tenant_id = public.get_tenant_id())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM listings WHERE listings.id = listing_images.listing_id AND listings.tenant_id = public.get_tenant_id())
  );

CREATE POLICY listing_images_delete_tenant_admin
  ON listing_images FOR DELETE TO authenticated
  USING (
    public.get_user_role() = 'tenant_admin'
    AND EXISTS (SELECT 1 FROM listings WHERE listings.id = listing_images.listing_id AND listings.tenant_id = public.get_tenant_id())
  );

CREATE POLICY listing_images_select_agent
  ON listing_images FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'agent'
    AND EXISTS (SELECT 1 FROM listings WHERE listings.id = listing_images.listing_id AND listings.tenant_id = public.get_tenant_id())
  );

CREATE POLICY listing_images_insert_agent
  ON listing_images FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() = 'agent'
    AND EXISTS (SELECT 1 FROM listings WHERE listings.id = listing_images.listing_id AND listings.tenant_id = public.get_tenant_id() AND listings.agent_id = auth.uid())
  );

CREATE POLICY listing_images_update_agent
  ON listing_images FOR UPDATE TO authenticated
  USING (
    public.get_user_role() = 'agent'
    AND EXISTS (SELECT 1 FROM listings WHERE listings.id = listing_images.listing_id AND listings.tenant_id = public.get_tenant_id() AND listings.agent_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM listings WHERE listings.id = listing_images.listing_id AND listings.tenant_id = public.get_tenant_id() AND listings.agent_id = auth.uid())
  );

CREATE POLICY listing_images_delete_agent
  ON listing_images FOR DELETE TO authenticated
  USING (
    public.get_user_role() = 'agent'
    AND EXISTS (SELECT 1 FROM listings WHERE listings.id = listing_images.listing_id AND listings.tenant_id = public.get_tenant_id() AND listings.agent_id = auth.uid())
  );

CREATE POLICY listing_images_select_seller
  ON listing_images FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'seller'
    AND EXISTS (SELECT 1 FROM listings WHERE listings.id = listing_images.listing_id AND listings.agent_id = auth.uid())
  );

CREATE POLICY listing_images_insert_seller
  ON listing_images FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() = 'seller'
    AND EXISTS (SELECT 1 FROM listings WHERE listings.id = listing_images.listing_id AND listings.agent_id = auth.uid())
  );

CREATE POLICY listing_images_delete_seller
  ON listing_images FOR DELETE TO authenticated
  USING (
    public.get_user_role() = 'seller'
    AND EXISTS (SELECT 1 FROM listings WHERE listings.id = listing_images.listing_id AND listings.agent_id = auth.uid())
  );


-- ============================================================================
-- INQUIRIES
-- ============================================================================

ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY inquiries_all_super_admin
  ON inquiries FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY inquiries_insert_buyer
  ON inquiries FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() = 'buyer'
    AND buyer_id = auth.uid()
    AND EXISTS (SELECT 1 FROM listings WHERE listings.id = inquiries.listing_id AND listings.status = 'active')
  );

CREATE POLICY inquiries_select_buyer
  ON inquiries FOR SELECT TO authenticated
  USING (public.get_user_role() = 'buyer' AND buyer_id = auth.uid());

CREATE POLICY inquiries_update_buyer
  ON inquiries FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'buyer' AND buyer_id = auth.uid())
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY inquiries_select_tenant_admin
  ON inquiries FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'tenant_admin'
    AND EXISTS (SELECT 1 FROM listings WHERE listings.id = inquiries.listing_id AND listings.tenant_id = public.get_tenant_id())
  );

CREATE POLICY inquiries_update_tenant_admin
  ON inquiries FOR UPDATE TO authenticated
  USING (
    public.get_user_role() = 'tenant_admin'
    AND EXISTS (SELECT 1 FROM listings WHERE listings.id = inquiries.listing_id AND listings.tenant_id = public.get_tenant_id())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM listings WHERE listings.id = inquiries.listing_id AND listings.tenant_id = public.get_tenant_id())
  );

CREATE POLICY inquiries_select_agent
  ON inquiries FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'agent'
    AND EXISTS (SELECT 1 FROM listings WHERE listings.id = inquiries.listing_id AND listings.tenant_id = public.get_tenant_id())
  );

CREATE POLICY inquiries_update_agent
  ON inquiries FOR UPDATE TO authenticated
  USING (
    public.get_user_role() = 'agent'
    AND EXISTS (SELECT 1 FROM listings WHERE listings.id = inquiries.listing_id AND listings.agent_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM listings WHERE listings.id = inquiries.listing_id AND listings.agent_id = auth.uid())
  );

CREATE POLICY inquiries_select_seller
  ON inquiries FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'seller'
    AND EXISTS (SELECT 1 FROM listings WHERE listings.id = inquiries.listing_id AND listings.agent_id = auth.uid())
  );

-- ============================================================================
-- Performance indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_listings_tenant_id ON listings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_listings_agent_id ON listings(agent_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listing_images_listing_id ON listing_images(listing_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_listing_id ON inquiries(listing_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_buyer_id ON inquiries(buyer_id);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
