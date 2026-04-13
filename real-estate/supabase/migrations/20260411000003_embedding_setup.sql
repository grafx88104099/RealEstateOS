-- AI Matching Layer: embedding column, HNSW index, similarity search function
-- Stack: Supabase PostgreSQL + pgvector + OpenAI text-embedding-3-small (1536 dims)

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to listings table
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ADD COLUMN IF NOT EXISTS embedding_updated_at timestamptz;

-- HNSW index for fast cosine similarity search
-- m=16, ef_construction=64 balances speed vs recall for <1M rows
CREATE INDEX IF NOT EXISTS idx_listings_embedding_hnsw
  ON listings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Partial index: only index active listings with embeddings
CREATE INDEX IF NOT EXISTS idx_listings_embedding_hnsw_active
  ON listings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64)
  WHERE status = 'active' AND embedding IS NOT NULL;

-- Composite index for tenant-scoped searches
CREATE INDEX IF NOT EXISTS idx_listings_tenant_status
  ON listings (tenant_id, status)
  WHERE status = 'active';

----------------------------------------------------------------------
-- RPC: match_listings
-- Tenant-isolated similarity search with filters
----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION match_listings(
  query_embedding vector(1536),
  p_tenant_id uuid,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  p_min_price bigint DEFAULT NULL,
  p_max_price bigint DEFAULT NULL,
  p_min_rooms int DEFAULT NULL,
  p_max_rooms int DEFAULT NULL,
  p_property_type text DEFAULT NULL,
  p_district text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  price bigint,
  rooms int,
  property_type text,
  district text,
  address text,
  area_sqm numeric,
  latitude double precision,
  longitude double precision,
  images text[],
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.title,
    l.description,
    l.price,
    l.rooms,
    l.property_type,
    l.district,
    l.address,
    l.area_sqm,
    l.latitude,
    l.longitude,
    l.images,
    1 - (l.embedding <=> query_embedding) AS similarity
  FROM listings l
  WHERE l.tenant_id = p_tenant_id
    AND l.status = 'active'
    AND l.embedding IS NOT NULL
    AND 1 - (l.embedding <=> query_embedding) > match_threshold
    -- Optional filters
    AND (p_min_price IS NULL OR l.price >= p_min_price)
    AND (p_max_price IS NULL OR l.price <= p_max_price)
    AND (p_min_rooms IS NULL OR l.rooms >= p_min_rooms)
    AND (p_max_rooms IS NULL OR l.rooms <= p_max_rooms)
    AND (p_property_type IS NULL OR l.property_type = p_property_type)
    AND (p_district IS NULL OR l.district = p_district)
  ORDER BY l.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute to authenticated users (RLS still applies via tenant_id param)
GRANT EXECUTE ON FUNCTION match_listings TO authenticated;

----------------------------------------------------------------------
-- RPC: match_listings_for_buyer
-- Find listings matching a buyer's saved preference embedding
----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION match_listings_for_buyer(
  p_buyer_id uuid,
  p_tenant_id uuid,
  match_threshold float DEFAULT 0.65,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  title text,
  price bigint,
  rooms int,
  property_type text,
  district text,
  area_sqm numeric,
  images text[],
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  buyer_embedding vector(1536);
BEGIN
  -- Get buyer's preference embedding
  SELECT bp.embedding INTO buyer_embedding
  FROM buyer_preferences bp
  WHERE bp.user_id = p_buyer_id
    AND bp.tenant_id = p_tenant_id;

  IF buyer_embedding IS NULL THEN
    RAISE EXCEPTION 'Buyer has no preference embedding';
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.title,
    l.price,
    l.rooms,
    l.property_type,
    l.district,
    l.area_sqm,
    l.images,
    1 - (l.embedding <=> buyer_embedding) AS similarity
  FROM listings l
  WHERE l.tenant_id = p_tenant_id
    AND l.status = 'active'
    AND l.embedding IS NOT NULL
    AND 1 - (l.embedding <=> buyer_embedding) > match_threshold
  ORDER BY l.embedding <=> buyer_embedding
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION match_listings_for_buyer TO authenticated;
