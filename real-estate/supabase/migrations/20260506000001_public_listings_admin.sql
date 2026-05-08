-- Phase A: Public Listings Admin module
-- Adds moderation, featured, view tracking + audit events.
-- Tenant-side opt-in for mandatory review queue.

-- 1. Listing extensions
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_until timestamptz,
  ADD COLUMN IF NOT EXISTS featured_position int,
  ADD COLUMN IF NOT EXISTS view_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderation_notes text,
  ADD COLUMN IF NOT EXISTS moderation_reviewed_by uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS moderation_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_reason text;

-- 2. Add 'rejected' to status enum (idempotent)
ALTER TYPE listing_status ADD VALUE IF NOT EXISTS 'rejected';

-- 3. Index for featured carousel ordering
CREATE INDEX IF NOT EXISTS listings_featured_idx
  ON listings (featured_position)
  WHERE featured AND deleted_at IS NULL;

-- 4. Tenant-side opt-in for mandatory review
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS requires_listing_review boolean NOT NULL DEFAULT false;

-- 5. Audit log
CREATE TABLE IF NOT EXISTS listing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users(id),
  event_type text NOT NULL,
  from_status text,
  to_status text,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS listing_events_listing_idx
  ON listing_events (listing_id, created_at DESC);

ALTER TABLE listing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin full access to listing_events"
  ON listing_events FOR ALL
  USING ((auth.jwt() ->> 'user_role') = 'super_admin');

CREATE POLICY "Tenant members read own tenant events"
  ON listing_events FOR SELECT
  USING (
    listing_id IN (
      SELECT id FROM listings
      WHERE tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  );
