-- Data integrity hardening
-- 1. Listings.version — optimistic locking
-- 2. CHECK constraints — production-д invalid өгөгдөл бий бол энэ migration warning-тэй буцна.
--    Тиймээс эхэлж шууд version column нэмж, CHECK-ыг handlers + zod-аар л шахна.
--
-- TODO (future): production data cleanup → migration 20260601 дотор CHECK нэмнэ:
--   UPDATE listings SET price = NULL WHERE price IS NOT NULL AND price <= 0;
--   ALTER TABLE listings ADD CONSTRAINT listings_price_positive
--     CHECK (price IS NULL OR (price > 0 AND price < 1e12));

ALTER TABLE listings ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 0;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 0;
