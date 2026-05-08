-- ============================================================================
-- Real Estate Marketplace — Production Schema
-- Stack: Supabase PostgreSQL + pgvector (HNSW) + PostGIS
-- Multi-tenant: tenant = agency
-- Auth: Supabase Auth (JWT: tenant_id + role)
-- ============================================================================

-- ===================
-- Extensions
-- ===================
-- uuid-ossp not needed, using gen_random_uuid() built-in
CREATE EXTENSION IF NOT EXISTS "postgis";         -- Spatial queries
CREATE EXTENSION IF NOT EXISTS "vector";          -- pgvector for AI similarity search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";         -- Trigram index for fuzzy text search

-- ===================
-- Custom types
-- ===================
CREATE TYPE user_role AS ENUM (
  'super_admin',
  'tenant_admin',
  'agent',
  'seller',
  'buyer'
);

CREATE TYPE listing_status AS ENUM (
  'draft',
  'pending_review',
  'active',
  'sold',
  'rented',
  'expired',
  'archived'
);

CREATE TYPE listing_type AS ENUM (
  'sale',
  'rent'
);

CREATE TYPE property_type AS ENUM (
  'apartment',
  'house',
  'land',
  'commercial',
  'office',
  'warehouse',
  'ger_district',
  'other'
);

CREATE TYPE inquiry_status AS ENUM (
  'new',
  'contacted',
  'viewing_scheduled',
  'negotiating',
  'closed_won',
  'closed_lost'
);

-- ===================
-- Helper: auto-update updated_at
-- ===================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. TENANTS (agencies)
-- ============================================================================
CREATE TABLE tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  logo_url      TEXT,
  domain        TEXT,
  subscription  TEXT NOT NULL DEFAULT 'free',
  settings      JSONB NOT NULL DEFAULT '{}',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE UNIQUE INDEX idx_tenants_slug ON tenants (slug) WHERE deleted_at IS NULL;

-- ============================================================================
-- 2. USERS (profiles linked to Supabase Auth)
-- ============================================================================
CREATE TABLE users (
  id            UUID PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role          user_role NOT NULL DEFAULT 'buyer',
  email         TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  phone         TEXT,
  avatar_url    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_users_tenant_id ON users (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users (tenant_id, role) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_users_email ON users (email) WHERE deleted_at IS NULL;

-- ============================================================================
-- 3. LISTINGS (properties)
-- ============================================================================
CREATE TABLE listings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id        UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  seller_id       UUID REFERENCES users(id) ON DELETE SET NULL,

  title           TEXT NOT NULL,
  slug            TEXT NOT NULL,
  description     TEXT,
  listing_type    listing_type NOT NULL DEFAULT 'sale',
  property_type   property_type NOT NULL DEFAULT 'apartment',
  status          listing_status NOT NULL DEFAULT 'draft',

  price           BIGINT NOT NULL CHECK (price >= 0),
  price_per_sqm   NUMERIC(12,2),
  currency        TEXT NOT NULL DEFAULT 'MNT',

  area_sqm        NUMERIC(10,2),
  rooms           SMALLINT,
  bedrooms        SMALLINT,
  bathrooms       SMALLINT,
  floor           SMALLINT,
  total_floors    SMALLINT,
  built_year      SMALLINT,
  has_parking     BOOLEAN DEFAULT FALSE,
  is_furnished    BOOLEAN DEFAULT FALSE,

  address         TEXT,
  district        TEXT,
  khoroo          TEXT,
  city            TEXT NOT NULL DEFAULT 'Улаанбаатар',

  location        GEOMETRY(Point, 4326),
  embedding       VECTOR(1536),

  fts             TSVECTOR GENERATED ALWAYS AS (
                    SETWEIGHT(TO_TSVECTOR('simple', COALESCE(title, '')), 'A') ||
                    SETWEIGHT(TO_TSVECTOR('simple', COALESCE(description, '')), 'B') ||
                    SETWEIGHT(TO_TSVECTOR('simple', COALESCE(address, '')), 'C') ||
                    SETWEIGHT(TO_TSVECTOR('simple', COALESCE(district, '')), 'C')
                  ) STORED,

  features        JSONB NOT NULL DEFAULT '[]',
  metadata        JSONB NOT NULL DEFAULT '{}',

  published_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,

  CONSTRAINT uq_listing_slug_per_tenant UNIQUE (tenant_id, slug)
);

CREATE TRIGGER trg_listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_listings_tenant_status ON listings (tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_listings_agent ON listings (agent_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_listings_price ON listings (tenant_id, price) WHERE deleted_at IS NULL AND status = 'active';
CREATE INDEX idx_listings_property_type ON listings (tenant_id, property_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_listings_location ON listings USING GIST (location) WHERE deleted_at IS NULL;
CREATE INDEX idx_listings_embedding ON listings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 200);
CREATE INDEX idx_listings_fts ON listings USING GIN (fts);
CREATE INDEX idx_listings_features ON listings USING GIN (features);

-- ============================================================================
-- 4. LISTING_IMAGES
-- ============================================================================
CREATE TABLE listing_images (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id    UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  url           TEXT NOT NULL,
  thumbnail_url TEXT,
  alt_text      TEXT,
  sort_order    SMALLINT NOT NULL DEFAULT 0,
  is_cover      BOOLEAN NOT NULL DEFAULT FALSE,
  width         INT,
  height        INT,
  file_size     INT,
  mime_type     TEXT,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE TRIGGER trg_listing_images_updated_at
  BEFORE UPDATE ON listing_images
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_listing_images_listing ON listing_images (listing_id, sort_order) WHERE deleted_at IS NULL;
CREATE INDEX idx_listing_images_tenant ON listing_images (tenant_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- 5. INQUIRIES (buyer → listing)
-- ============================================================================
CREATE TABLE inquiries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  listing_id    UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id      UUID REFERENCES users(id) ON DELETE SET NULL,

  status        inquiry_status NOT NULL DEFAULT 'new',
  message       TEXT,
  notes         TEXT,
  metadata      JSONB NOT NULL DEFAULT '{}',

  contacted_at  TIMESTAMPTZ,
  closed_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE TRIGGER trg_inquiries_updated_at
  BEFORE UPDATE ON inquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_inquiries_tenant ON inquiries (tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_inquiries_listing ON inquiries (listing_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_inquiries_buyer ON inquiries (buyer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_inquiries_agent ON inquiries (agent_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION search_listings_by_embedding(
  query_embedding VECTOR(1536),
  match_tenant_id UUID DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.78,
  match_count INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  price BIGINT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.title,
    l.price,
    1 - (l.embedding <=> query_embedding) AS similarity
  FROM listings l
  WHERE l.deleted_at IS NULL
    AND l.status = 'active'
    AND l.embedding IS NOT NULL
    AND (match_tenant_id IS NULL OR l.tenant_id = match_tenant_id)
    AND 1 - (l.embedding <=> query_embedding) > match_threshold
  ORDER BY l.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION search_listings_nearby(
  lat FLOAT,
  lng FLOAT,
  radius_meters INT DEFAULT 5000,
  match_tenant_id UUID DEFAULT NULL,
  match_count INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  price BIGINT,
  distance_meters FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.title,
    l.price,
    ST_Distance(l.location::geography, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) AS distance_meters
  FROM listings l
  WHERE l.deleted_at IS NULL
    AND l.status = 'active'
    AND l.location IS NOT NULL
    AND (match_tenant_id IS NULL OR l.tenant_id = match_tenant_id)
    AND ST_DWithin(
      l.location::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_meters
    )
  ORDER BY distance_meters
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
