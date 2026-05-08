-- Phase 2: AI agent conversations, offers, viewings
-- Enables buyer/seller AI agents with multi-turn memory + autonomous offer/viewing flows

-- ─── ai_conversations ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  agent_type text NOT NULL CHECK (agent_type IN ('buyer','seller')),
  context_listing_id uuid REFERENCES listings(id) ON DELETE SET NULL,
  title text,
  context jsonb DEFAULT '{}'::jsonb,

  created_at timestamptz DEFAULT now(),
  last_message_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_conv_user
  ON ai_conversations (user_id, last_message_at DESC);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own conversations"
  ON ai_conversations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users create own conversations"
  ON ai_conversations FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY "Users update own conversations"
  ON ai_conversations FOR UPDATE
  USING (user_id = auth.uid());

-- ─── ai_messages ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','tool','system')),
  content text NOT NULL,
  tool_calls jsonb,        -- assistant-side tool_call array
  tool_results jsonb,      -- tool-side result payloads (e.g. listing ids)
  tokens_used int,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_msg_conv
  ON ai_messages (conversation_id, created_at);

ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see messages in own conversations"
  ON ai_messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM ai_conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users insert messages in own conversations"
  ON ai_messages FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM ai_conversations WHERE user_id = auth.uid()
    )
  );

-- ─── offers ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  amount bigint NOT NULL,
  terms jsonb DEFAULT '{}'::jsonb,
  message text,

  status text NOT NULL DEFAULT 'pending_seller_ai' CHECK (status IN (
    'draft',
    'pending_seller_ai',
    'pending_seller_review',
    'countered',
    'accepted',
    'rejected',
    'withdrawn',
    'expired'
  )),

  created_by text NOT NULL DEFAULT 'human' CHECK (created_by IN ('human','ai')),
  ai_reasoning text,
  parent_offer_id uuid REFERENCES offers(id) ON DELETE SET NULL,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_offers_listing ON offers (listing_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offers_buyer   ON offers (buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offers_seller  ON offers (seller_id, created_at DESC);

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyer sees own offers"
  ON offers FOR SELECT USING (buyer_id = auth.uid());

CREATE POLICY "Seller sees offers on own listings"
  ON offers FOR SELECT USING (
    seller_id = auth.uid()
    OR listing_id IN (SELECT id FROM listings WHERE agent_id = auth.uid())
  );

CREATE POLICY "Buyer creates own offers"
  ON offers FOR INSERT WITH CHECK (
    buyer_id = auth.uid()
    AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY "Buyer updates own offers"
  ON offers FOR UPDATE USING (buyer_id = auth.uid());

CREATE POLICY "Seller updates offers on own listings"
  ON offers FOR UPDATE USING (
    seller_id = auth.uid()
    OR listing_id IN (SELECT id FROM listings WHERE agent_id = auth.uid())
  );

-- ─── viewings ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS viewings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  proposed_slots jsonb DEFAULT '[]'::jsonb,  -- array of timestamptz suggestions
  confirmed_at timestamptz,
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN (
    'proposed','confirmed','completed','cancelled','no_show'
  )),

  notes text,
  created_by text NOT NULL DEFAULT 'human' CHECK (created_by IN ('human','ai')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_viewings_listing ON viewings (listing_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_viewings_buyer   ON viewings (buyer_id, created_at DESC);

ALTER TABLE viewings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyer sees own viewings"
  ON viewings FOR SELECT USING (buyer_id = auth.uid());

CREATE POLICY "Seller sees viewings on own listings"
  ON viewings FOR SELECT USING (
    seller_id = auth.uid()
    OR listing_id IN (SELECT id FROM listings WHERE agent_id = auth.uid())
  );

CREATE POLICY "Buyer creates own viewings"
  ON viewings FOR INSERT WITH CHECK (
    buyer_id = auth.uid()
    AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY "Participants update viewing"
  ON viewings FOR UPDATE USING (
    buyer_id = auth.uid()
    OR seller_id = auth.uid()
    OR listing_id IN (SELECT id FROM listings WHERE agent_id = auth.uid())
  );

-- ─── update last_message_at trigger ───────────────────────────────
CREATE OR REPLACE FUNCTION bump_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bump_conv_last_msg ON ai_messages;
CREATE TRIGGER trg_bump_conv_last_msg
  AFTER INSERT ON ai_messages
  FOR EACH ROW EXECUTE FUNCTION bump_conversation_last_message();
