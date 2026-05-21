// PATCH /api/super/tenants/[id] — super_admin updates tenant fields
// Allowed: subscription, name, requires_listing_review, status (active↔suspended only)
// status шилжилт: approve/reject endpoint-аар хийнэ (анхны activation-д approved_at audit).
// `is_active`-ыг шууд PATCH хийх боломжгүй — DB trigger status-аас sync хийнэ.
import { NextRequest, NextResponse } from "next/server";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

const ALLOWED_SUBS = new Set(["free", "pro", "enterprise"]);
const ALLOWED_STATUS_TRANSITIONS: Record<string, Set<string>> = {
  active: new Set(["suspended"]),
  suspended: new Set(["active"]),
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await withAuth(req, ["super_admin"]);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const updates: Record<string, unknown> = {};

  if (typeof body.requires_listing_review === "boolean") {
    updates.requires_listing_review = body.requires_listing_review;
  }
  if (typeof body.subscription === "string" && ALLOWED_SUBS.has(body.subscription)) {
    updates.subscription = body.subscription;
  }
  if (typeof body.name === "string") {
    const v = body.name.trim();
    if (v.length > 0 && v.length <= 200) updates.name = v;
  }

  // Status: active↔suspended л зөвшөөрөгдөнө. Бусад шилжилт approve/reject-ээр хийнэ.
  if (typeof body.status === "string") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: cur } = await (supabaseAdmin as any)
      .from("tenants")
      .select("status")
      .eq("id", id)
      .is("deleted_at", null)
      .single();
    if (!cur) return NextResponse.json({ error: "Олдсонгүй" }, { status: 404 });
    const allowed = ALLOWED_STATUS_TRANSITIONS[cur.status as string];
    if (!allowed || !allowed.has(body.status)) {
      return NextResponse.json(
        { error: `${cur.status} → ${body.status} шилжилт боломжгүй. Зөвшөөрөх/татгалзах үйлдлийг тусдаа товчоор хийнэ үү.` },
        { status: 400 },
      );
    }
    updates.status = body.status;
    // is_active нь DB trigger-ээр автоматаар sync болно — хүний гараар бичих хэрэггүй
  }

  // body.is_active-ыг зориудаар үл хайхрана — status-аас derive хийнэ

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Засах талбар алга" }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabaseAdmin as any)
    .from("tenants")
    .update(updates)
    .eq("id", id)
    .is("deleted_at", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
