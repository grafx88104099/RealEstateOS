-- Buyer preferences table for reverse matching
-- Stores buyer search criteria as embedding for "listings → buyer" matching

CREATE TABLE IF NOT EXISTS buyer_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Structured preferences
  min_price bigint,
  max_price bigint,
  min_rooms int,
  max_rooms int,
  property_types text[],        -- ['apartment', 'house', 'office']
  preferred_districts text[],   -- ['БЗД', 'СБД', 'ХУД']
  min_area_sqm numeric,
  max_area_sqm numeric,
  description text,             -- Free-text: "Гэр бүлд тохиромжтой, сургууль ойр"

  -- AI embedding of combined preferences
  embedding vector(1536),
  embedding_updated_at timestamptz,

  -- Notification preferences
  notify_new_matches boolean DEFAULT true,
  notify_price_drops boolean DEFAULT true,
  last_notified_at timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(user_id, tenant_id)
);

-- RLS
ALTER TABLE buyer_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON buyer_preferences FOR SELECT
  USING (
    user_id = auth.uid()
    AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY "Users can insert own preferences"
  ON buyer_preferences FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY "Users can update own preferences"
  ON buyer_preferences FOR UPDATE
  USING (
    user_id = auth.uid()
    AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- Agents/admins can view all preferences in their tenant
CREATE POLICY "Agents can view tenant preferences"
  ON buyer_preferences FOR SELECT
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (auth.jwt() ->> 'role') IN ('agent', 'tenant_admin', 'super_admin')
  );

-- Index for buyer lookup
CREATE INDEX IF NOT EXISTS idx_buyer_prefs_user_tenant
  ON buyer_preferences (user_id, tenant_id);

-- HNSW index for reverse matching (find buyers for a listing)
CREATE INDEX IF NOT EXISTS idx_buyer_prefs_embedding_hnsw
  ON buyer_preferences
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64)
  WHERE embedding IS NOT NULL;
