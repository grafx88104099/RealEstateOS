// GET   /api/inquiries/[id]
// PATCH /api/inquiries/[id] — status/notes update

import { NextRequest, NextResponse } from "next/server";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withAuth(req, ["super_admin", "tenant_admin", "agent", "consumer"]);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from("inquiries")
    .select(`
      id, status, message, notes, created_at, contacted_at, closed_at,
      listing:listings(id, title, district, price, property_type),
      buyer:users!buyer_id(id, full_name, email, phone)
    `)
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: "Олдсонгүй" }, { status: 404 });
  return NextResponse.json({ inquiry: data });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withAuth(req, ["super_admin", "tenant_admin", "agent"]);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const supabase = await createSupabaseServer();

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const allowed = ["status", "notes", "contacted_at", "closed_at"];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Өөрчлөх талбар байхгүй" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("inquiries")
    .update(updates as never)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ inquiry: data });
}
