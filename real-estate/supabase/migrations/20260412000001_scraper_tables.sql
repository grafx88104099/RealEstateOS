-- ============================================================================
-- SCRAPER SYSTEM: Auto-import listings from external sources
-- ============================================================================

-- 1. Scraper sources configuration
CREATE TABLE IF NOT EXISTS scraper_sources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  base_url        TEXT NOT NULL,
  category_paths  TEXT[] NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  config          JSONB NOT NULL DEFAULT '{}',
  last_scraped_at TIMESTAMPTZ,
  total_scraped   INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Scraped listings (pending review)
CREATE TABLE IF NOT EXISTS scraped_listings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_id       UUID REFERENCES scraper_sources(id) ON DELETE SET NULL,

  source_url      TEXT NOT NULL,
  source_ext_id   TEXT,
  source_site     TEXT NOT NULL,

  title           TEXT,
  description     TEXT,
  price           BIGINT,
  rooms           SMALLINT,
  area_sqm        NUMERIC(10,2),
  floor           SMALLINT,
  total_floors    SMALLINT,
  district        TEXT,
  address         TEXT,
  property_type   TEXT DEFAULT 'apartment',
  listing_type    TEXT DEFAULT 'sale',
  contact_phone   TEXT,
  images          TEXT[] DEFAULT '{}',
  raw_text        TEXT,
  parsed_data     JSONB DEFAULT '{}',

  ai_confidence   NUMERIC(3,2) DEFAULT 0,
  ai_parsed_at    TIMESTAMPTZ,

  status          TEXT NOT NULL DEFAULT 'pending_review',
  duplicate_of    UUID REFERENCES listings(id),
  imported_listing_id UUID REFERENCES listings(id),
  reviewed_by     UUID REFERENCES users(id),
  reviewed_at     TIMESTAMPTZ,

  first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  price_history   JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_scraped_source_ext
  ON scraped_listings(source_site, source_ext_id)
  WHERE source_ext_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scraped_status
  ON scraped_listings(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_scraped_created
  ON scraped_listings(created_at DESC);

-- 3. Scraper run logs
CREATE TABLE IF NOT EXISTS scraper_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_id       UUID REFERENCES scraper_sources(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'running',
  pages_scraped   INT NOT NULL DEFAULT 0,
  listings_found  INT NOT NULL DEFAULT 0,
  listings_new    INT NOT NULL DEFAULT 0,
  listings_updated INT NOT NULL DEFAULT 0,
  errors          JSONB DEFAULT '[]',
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at     TIMESTAMPTZ
);

-- RLS
ALTER TABLE scraper_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraped_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraper_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY scraper_sources_tenant ON scraper_sources
  FOR ALL USING (tenant_id = ((current_setting('request.jwt.claims',true)::jsonb)->>'tenant_id')::uuid);

CREATE POLICY scraped_listings_tenant ON scraped_listings
  FOR ALL USING (tenant_id = ((current_setting('request.jwt.claims',true)::jsonb)->>'tenant_id')::uuid);

CREATE POLICY scraper_runs_tenant ON scraper_runs
  FOR ALL USING (tenant_id = ((current_setting('request.jwt.claims',true)::jsonb)->>'tenant_id')::uuid);
