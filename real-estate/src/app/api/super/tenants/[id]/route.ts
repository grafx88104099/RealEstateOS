// PATCH /api/super/tenants/[id] — super_admin updates tenant fields
// Allowed: is_active, subscription, name, requires_listing_review
import { NextRequest, NextResponse } from "next/server";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

const ALLOWED_SUBS = new Set(["free", "pro", "enterprise"]);
const ALLOWED_STATUS_SET = new Set(["active", "suspended"]); // sa зөвхөн идэвхтэй ↔ түр хаах гар үйлдэл

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
  if (typeof body.is_active === "boolean") updates.is_active = body.is_active;
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
  // Status: зөвхөн active/suspended (approve/reject өөр endpoint ашиглана)
  if (typeof body.status === "string" && ALLOWED_STATUS_SET.has(body.status)) {
    updates.status = body.status;
    updates.is_active = body.status === "active";
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Засах талбар алга" }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabaseAdmin as any)
    .from("tenants")
    .update(updates)
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
