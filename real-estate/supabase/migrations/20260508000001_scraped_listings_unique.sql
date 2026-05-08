-- Add unique constraint required for ON CONFLICT (source_site, source_ext_id) upserts
-- in the Render scraper-worker. Without it, upserts fail with 42P10:
--   "there is no unique or exclusion constraint matching the ON CONFLICT specification".

-- Remove any orphan duplicates first (keep the oldest).
DELETE FROM scraped_listings a
USING scraped_listings b
WHERE a.id > b.id
  AND a.source_site = b.source_site
  AND a.source_ext_id = b.source_ext_id;

ALTER TABLE scraped_listings
  ADD CONSTRAINT scraped_listings_source_site_ext_id_key
  UNIQUE (source_site, source_ext_id);
