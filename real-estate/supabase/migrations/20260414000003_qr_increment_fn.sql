-- Atomically increment scan count for QR links
CREATE OR REPLACE FUNCTION increment_scan_count(link_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE qr_links SET scan_count = scan_count + 1 WHERE id = link_id;
$$;
