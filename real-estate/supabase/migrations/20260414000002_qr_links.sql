-- Dynamic QR links table
CREATE TABLE qr_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,
  target_url  TEXT NOT NULL,
  scan_count  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_qr_links_updated_at
  BEFORE UPDATE ON qr_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE qr_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read qr_links for redirect"
  ON qr_links FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role manages qr_links"
  ON qr_links FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Super admin manages qr_links"
  ON qr_links FOR ALL
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'super_admin')
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'super_admin');

-- Seed: default usa-survey QR link
INSERT INTO qr_links (slug, target_url) VALUES ('usa-survey', '/survey');
