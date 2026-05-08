-- Phase 2: expose lat/lng as generated columns so PostgREST clients (Flutter map)
-- can read coordinates without PostGIS-specific JSON parsing.
-- ST_X / ST_Y are IMMUTABLE on the PostGIS Point geometry, so STORED works.

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS lat double precision
    GENERATED ALWAYS AS (ST_Y(location)) STORED;

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS lng double precision
    GENERATED ALWAYS AS (ST_X(location)) STORED;

CREATE INDEX IF NOT EXISTS idx_listings_lat_lng
  ON listings (lat, lng)
  WHERE deleted_at IS NULL AND lat IS NOT NULL;
