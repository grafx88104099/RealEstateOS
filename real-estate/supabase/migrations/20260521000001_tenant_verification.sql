-- Tenant verification gate
-- Шинэ оффис нээх үед: pending_email → pending_approval → active/rejected/suspended
-- Одоо байгаа tenants-ийг бүгдийг 'active'-ээр backfill хийнэ.

CREATE TYPE tenant_status AS ENUM (
  'pending_email',
  'pending_approval',
  'active',
  'rejected',
  'suspended'
);

ALTER TABLE tenants
  ADD COLUMN status            tenant_status NOT NULL DEFAULT 'pending_email',
  ADD COLUMN email_verified_at TIMESTAMPTZ,
  ADD COLUMN approved_at       TIMESTAMPTZ,
  ADD COLUMN approved_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN rejection_reason  TEXT,
  ADD COLUMN applicant_phone   TEXT,
  ADD COLUMN applicant_message TEXT;

-- Backfill: одоо байгаа tenants бүгд active (бид одоо verification gate нэвтрүүлж байна)
UPDATE tenants
SET status = 'active',
    email_verified_at = created_at,
    approved_at = created_at
WHERE deleted_at IS NULL;

CREATE INDEX idx_tenants_status ON tenants(status) WHERE deleted_at IS NULL;

-- Email verification tokens (single-use, 24h TTL)
CREATE TABLE tenant_email_tokens (
  token       TEXT PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenant_email_tokens_tenant
  ON tenant_email_tokens(tenant_id)
  WHERE used_at IS NULL;

-- RLS: zөвхөн service_role ашиглана
ALTER TABLE tenant_email_tokens ENABLE ROW LEVEL SECURITY;
