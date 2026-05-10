// PATCH /api/me/profile — нэвтэрсэн хэрэглэгчийн өөрийнх нь профайлыг засах
// (full_name, phone, avatar_url)
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Нэвтрээгүй" }, { status: 401 });
  }

  let body: { full_name?: string; phone?: string | null; avatar_url?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.full_name === "string") {
    const v = body.full_name.trim();
    if (v.length > 0 && v.length <= 200) updates.full_name = v;
  }
  if ("phone" in body) {
    const v = (body.phone ?? "").toString().trim();
    updates.phone = v.length > 0 ? v.slice(0, 50) : null;
  }
  if ("avatar_url" in body) {
    const v = (body.avatar_url ?? "").toString().trim();
    updates.avatar_url = v.length > 0 ? v.slice(0, 1000) : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Засах талбар алга" }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from("users")
    .update(updates as never)
    .eq("id", session.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
