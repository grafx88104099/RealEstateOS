// GET   /api/inquiries/[id]
// PATCH /api/inquiries/[id] — status/notes update with tenant scope + transition guard

import { NextRequest, NextResponse } from "next/server";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Inquiry status шилжилтийн зөвшөөрөгдсөн graph
const ALLOWED_TRANSITIONS: Record<string, Set<string>> = {
  new: new Set(["contacted", "qualified", "closed_lost"]),
  contacted: new Set(["qualified", "closed_won", "closed_lost"]),
  qualified: new Set(["closed_won", "closed_lost"]),
  closed_won: new Set([]), // эцсийн төлөв
  closed_lost: new Set(["new"]), // reopen зөвшөөрнө
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withAuth(req, ["super_admin", "tenant_admin", "agent", "consumer"]);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const supabase = await createSupabaseServer();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabase
    .from("inquiries")
    .select(`
      id, status, message, notes, created_at, contacted_at, closed_at, tenant_id, agent_id, buyer_id,
      listing:listings(id, title, district, price, property_type),
      buyer:users!buyer_id(id, full_name, email, phone)
    `)
    .eq("id", id)
    .is("deleted_at", null);

  // Tenant scope
  if (auth.role !== "super_admin") q = q.eq("tenant_id", auth.tenantId);
  if (auth.role === "consumer") q = q.eq("buyer_id", auth.userId);
  if (auth.role === "agent") q = q.eq("agent_id", auth.userId);

  const { data, error } = await q.maybeSingle();

  if (error || !data) return NextResponse.json({ error: "Олдсонгүй" }, { status: 404 });
  return NextResponse.json({ inquiry: data });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withAuth(req, ["super_admin", "tenant_admin", "agent"]);
  if (isAuthError(auth)) return auth;

  const { id } = await params;

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  // Inquiry-г олж эзэмшил шалгах
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: current } = await (supabaseAdmin as any)
    .from("inquiries")
    .select("id, status, tenant_id, agent_id")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!current) return NextResponse.json({ error: "Олдсонгүй" }, { status: 404 });
  if (auth.role !== "super_admin" && current.tenant_id !== auth.tenantId) {
    return NextResponse.json({ error: "Зөвшөөрөлгүй" }, { status: 403 });
  }
  if (auth.role === "agent" && current.agent_id !== auth.userId) {
    return NextResponse.json({ error: "Зөвхөн өөрт оноогдсон inquiry-г засна" }, { status: 403 });
  }

  // Whitelisted fields
  const ALLOWED_FIELDS = new Set(["status", "notes", "contacted_at", "closed_at", "agent_id"]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {};
  for (const key of Object.keys(body)) {
    if (ALLOWED_FIELDS.has(key)) updates[key] = body[key];
  }

  // agent_id-г зөвхөн tenant_admin/super_admin өөрчилнө
  if ("agent_id" in updates && auth.role === "agent") {
    delete updates.agent_id;
  }

  // Status transition шалгалт
  if (typeof updates.status === "string" && updates.status !== current.status) {
    const allowed = ALLOWED_TRANSITIONS[current.status as string];
    if (!allowed || !allowed.has(updates.status)) {
      return NextResponse.json(
        { error: `${current.status} → ${updates.status} шилжилт боломжгүй` },
        { status: 400 },
      );
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Өөрчлөх талбар байхгүй" }, { status: 400 });
  }
  updates.updated_at = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin as any)
    .from("inquiries")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ inquiry: data });
}
