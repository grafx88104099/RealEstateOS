-- Listings CHECK constraints
-- Production-д price = 0 байсан 1 row нь soft-deleted болж, price=1-аар тэмдэглэгдсэн
-- (placeholder, status='archived' тул дэлгэцэнд хэзээ ч харагдахгүй).
-- Schema-д `price NUMERIC NOT NULL` тул `price IS NULL` хувилбар орохгүй.

DO $$ BEGIN
  ALTER TABLE listings ADD CONSTRAINT listings_price_positive
    CHECK (price > 0 AND price < 1e12);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE listings ADD CONSTRAINT listings_area_positive
    CHECK (area_sqm IS NULL OR (area_sqm > 0 AND area_sqm < 100000));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE listings ADD CONSTRAINT listings_floor_range
    CHECK (floor IS NULL OR (floor >= -5 AND floor <= 200));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE listings ADD CONSTRAINT listings_total_floors_range
    CHECK (total_floors IS NULL OR (total_floors > 0 AND total_floors <= 200));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE listings ADD CONSTRAINT listings_rooms_range
    CHECK (rooms IS NULL OR (rooms >= 0 AND rooms <= 50));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
