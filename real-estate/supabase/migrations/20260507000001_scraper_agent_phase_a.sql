-- Phase A: Listing Discovery AI Agent
-- Adds scheduling queue, auto-promotion metadata, cost telemetry.

-- 1. scraper_sources extensions
ALTER TABLE scraper_sources
  ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cron_schedule text DEFAULT 'quick:60',
  ADD COLUMN IF NOT EXISTS auto_promote boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS confidence_threshold double precision DEFAULT 0.80,
  ADD COLUMN IF NOT EXISTS spam_threshold double precision DEFAULT 0.30,
  ADD COLUMN IF NOT EXISTS target_tenant_id uuid REFERENCES tenants(id);

-- 2. scraped_listings extensions
ALTER TABLE scraped_listings
  ADD COLUMN IF NOT EXISTS spam_score double precision,
  ADD COLUMN IF NOT EXISTS dedup_match_listing_id uuid REFERENCES listings(id),
  ADD COLUMN IF NOT EXISTS auto_promoted_at timestamptz,
  ADD COLUMN IF NOT EXISTS promotion_blocker text;

-- 3. scraper_runs extensions
ALTER TABLE scraper_runs
  ADD COLUMN IF NOT EXISTS token_usage jsonb DEFAULT '{}'::jsonb;

-- 4. scraper_jobs queue
CREATE TABLE IF NOT EXISTS scraper_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES scraper_sources(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('quick','full','deep')),
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','running','succeeded','failed','cancelled')),
  run_id uuid REFERENCES scraper_runs(id),
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scraper_jobs_due_idx
  ON scraper_jobs (scheduled_at)
  WHERE status = 'queued';

CREATE INDEX IF NOT EXISTS scraper_jobs_source_idx
  ON scraper_jobs (source_id, created_at DESC);

ALTER TABLE scraper_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin full access to scraper_jobs"
  ON scraper_jobs FOR ALL
  USING ((auth.jwt() ->> 'user_role') = 'super_admin');

-- 5. Initialize platform-tenant target for unegui.mn source if it exists
UPDATE scraper_sources
SET target_tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE target_tenant_id IS NULL
  AND base_url LIKE '%unegui.mn%';
