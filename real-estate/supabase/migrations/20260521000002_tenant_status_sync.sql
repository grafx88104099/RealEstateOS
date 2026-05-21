-- tenants.is_active ба tenants.status-ыг тогтмол sync хийх.
-- Хоёр эх сурвалж зөрчилдөхөөс зайлсхийнэ.
-- 1) Одоо байгаа desync-ыг засах
-- 2) Trigger: status өөрчлөгдсөн үед is_active автоматаар тогтоогдоно

-- Одоогийн desync засах: status='active' үед is_active=true, өөрөөр false
UPDATE tenants
SET is_active = (status = 'active'),
    updated_at = NOW()
WHERE deleted_at IS NULL
  AND is_active <> (status = 'active');

CREATE OR REPLACE FUNCTION sync_tenant_is_active() RETURNS TRIGGER AS $$
BEGIN
  NEW.is_active := (NEW.status = 'active');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_tenant_is_active ON tenants;
CREATE TRIGGER trg_sync_tenant_is_active
  BEFORE INSERT OR UPDATE OF status ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION sync_tenant_is_active();
