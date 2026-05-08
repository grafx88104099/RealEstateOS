-- Survey responses table for USA Mongolian real estate leads
CREATE TABLE survey_responses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Step 1: Personal info
  last_name     TEXT NOT NULL,
  first_name    TEXT NOT NULL,
  phone         TEXT,
  email         TEXT,
  us_state      TEXT,
  contact_time  TEXT,
  contact_method TEXT[] NOT NULL DEFAULT '{}',
  -- Step 2: Property interests
  property_type TEXT[] NOT NULL DEFAULT '{}',
  property_location TEXT[] NOT NULL DEFAULT '{}',
  property_purpose TEXT[] NOT NULL DEFAULT '{}',
  -- Step 3: Budget & timeline
  budget        TEXT,
  urgency       TEXT,
  financing     TEXT,
  prev_property TEXT,
  -- Step 4: Additional
  notes         TEXT,
  hear_about    TEXT[] NOT NULL DEFAULT '{}',
  -- Meta
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: anon can insert, service_role can read all
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit survey"
  ON survey_responses FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Service role reads all surveys"
  ON survey_responses FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Super admin reads surveys"
  ON survey_responses FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
  );
