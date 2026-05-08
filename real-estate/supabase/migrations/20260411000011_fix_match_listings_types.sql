-- smallint column-уудыг int-д cast хийх

DROP FUNCTION IF EXISTS match_listings(vector, uuid, float, int, bigint, bigint, int, int, text, text);

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
  floor int,
  total_floors int,
  listing_type text,
  slug text,
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
    l.rooms::int,
    l.property_type::text,
    l.district,
    l.address,
    l.area_sqm,
    l.floor::int,
    l.total_floors::int,
    l.listing_type::text,
    l.slug,
    (1 - (l.embedding <=> query_embedding))::float AS similarity
  FROM listings l
  WHERE l.tenant_id = p_tenant_id
    AND l.status::text = 'active'
    AND l.embedding IS NOT NULL
    AND l.deleted_at IS NULL
    AND (1 - (l.embedding <=> query_embedding)) > match_threshold
    AND (p_min_price IS NULL OR l.price >= p_min_price)
    AND (p_max_price IS NULL OR l.price <= p_max_price)
    AND (p_min_rooms IS NULL OR l.rooms::int >= p_min_rooms)
    AND (p_max_rooms IS NULL OR l.rooms::int <= p_max_rooms)
    AND (p_property_type IS NULL OR l.property_type::text = p_property_type)
    AND (p_district IS NULL OR l.district = p_district)
  ORDER BY l.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION match_listings TO authenticated, anon;
