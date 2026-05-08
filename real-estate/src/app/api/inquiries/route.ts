// GET  /api/inquiries — role-scoped inquiry list
// POST /api/inquiries — consumer creates inquiry

import { NextRequest, NextResponse } from "next/server";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const auth = await withAuth(req, ["super_admin", "tenant_admin", "agent", "consumer"]);
  if (isAuthError(auth)) return auth;

  const supabase = await createSupabaseServer();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("inquiries")
    .select(`
      id, status, message, created_at,
      listing:listings(id, title, district, price),
      buyer:users!buyer_id(id, full_name, email)
    `, { count: "exact" })
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Role-based scoping
  if (auth.role === "consumer") {
    // Consumer sees inquiries they sent (as buyer)
    query = query.eq("buyer_id", auth.userId);
  } else if (auth.role === "agent") {
    query = query.eq("agent_id", auth.userId);
  } else {
    // tenant_admin / super_admin: all in tenant
    query = query.eq("tenant_id", auth.tenantId);
  }

  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ inquiries: data, total: count, page, limit });
}

export async function POST(req: NextRequest) {
  const auth = await withAuth(req, ["consumer"]);
  if (isAuthError(auth)) return auth;

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { listing_id, message } = body;
  if (!listing_id) return NextResponse.json({ error: "listing_id шаардлагатай" }, { status: 400 });

  const { data: listing, error: lErr } = await supabaseAdmin
    .from("listings")
    .select("id, agent_id, tenant_id, status")
    .eq("id", String(listing_id))
    .single();

  if (lErr || !listing) return NextResponse.json({ error: "Зар олдсонгүй" }, { status: 404 });
  if (listing.status !== "active") return NextResponse.json({ error: "Зар идэвхтэй биш" }, { status: 400 });

  const { data: inquiry, error } = await supabaseAdmin
    .from("inquiries")
    .insert({
      tenant_id: listing.tenant_id,
      listing_id: String(listing_id),
      buyer_id: auth.userId,
      agent_id: listing.agent_id,
      message: message ? String(message) : null,
      status: "new",
    } as never)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ inquiry }, { status: 201 });
}
