-- Public cross-tenant similarity search (нэвтрэлтгүй хэрэглэгчдэд)
-- Зөвхөн status = 'active' зарыг буцаана

CREATE OR REPLACE FUNCTION match_listings_public(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.25,
  match_count int DEFAULT 20,
  p_min_price bigint DEFAULT NULL,
  p_max_price bigint DEFAULT NULL,
  p_min_rooms int DEFAULT NULL,
  p_property_type text DEFAULT NULL,
  p_district text DEFAULT NULL,
  p_listing_type text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  price bigint,
  rooms int,
  area_sqm numeric,
  floor smallint,
  total_floors smallint,
  property_type text,
  listing_type text,
  district text,
  address text,
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
    l.price,
    l.rooms::int,
    l.area_sqm,
    l.floor,
    l.total_floors,
    l.property_type::text,
    l.listing_type::text,
    l.district,
    l.address,
    1 - (l.embedding <=> query_embedding) AS similarity
  FROM listings l
  WHERE
    l.status = 'active'
    AND l.deleted_at IS NULL
    AND l.embedding IS NOT NULL
    AND 1 - (l.embedding <=> query_embedding) >= match_threshold
    AND (p_min_price IS NULL OR l.price >= p_min_price)
    AND (p_max_price IS NULL OR l.price <= p_max_price)
    AND (p_min_rooms IS NULL OR l.rooms >= p_min_rooms)
    AND (p_property_type IS NULL OR l.property_type::text = p_property_type)
    AND (p_district IS NULL OR l.district = p_district)
    AND (p_listing_type IS NULL OR l.listing_type::text = p_listing_type)
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION match_listings_public TO anon;
GRANT EXECUTE ON FUNCTION match_listings_public TO authenticated;
