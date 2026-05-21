-- Anonymous (зочин) inquiry-г дэмжих
-- buyer_id-г nullable болгож, guest_name/email/phone column нэмнэ.
-- Идэвхтэй buyer_id ИЛЭГНЭН эсвэл guest_* талбарууд бий гэж DB-level constraint-аар баталгаажуулна.

ALTER TABLE inquiries
  ALTER COLUMN buyer_id DROP NOT NULL,
  ADD COLUMN guest_name TEXT,
  ADD COLUMN guest_email TEXT,
  ADD COLUMN guest_phone TEXT;

-- Зочин эсвэл буюу нэвтэрсэн хэрэглэгч аль нэгийг шаардана
ALTER TABLE inquiries
  ADD CONSTRAINT inquiries_buyer_or_guest CHECK (
    buyer_id IS NOT NULL OR (guest_name IS NOT NULL AND (guest_email IS NOT NULL OR guest_phone IS NOT NULL))
  );

CREATE INDEX idx_inquiries_guest_phone ON inquiries(guest_phone) WHERE guest_phone IS NOT NULL;
