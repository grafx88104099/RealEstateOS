// PATCH /api/office/profile — оффисын нэр, утас, хаяг, тайлбар шинэчилнэ.
// tenant.name болон tenant.settings (JSONB) talkbar засна. tenant_admin only.
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { decodeJWT } from "@/lib/utils/jwt";

export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Нэвтрээгүй" }, { status: 401 });

  const payload = decodeJWT(session.access_token);
  const role = payload.user_role;
  const tenantId = payload.tenant_id as string | undefined;
  if (role !== "tenant_admin") {
    return NextResponse.json({ error: "Зөвхөн оффисын админ" }, { status: 403 });
  }
  if (!tenantId) {
    return NextResponse.json({ error: "tenant_id JWT-д алга" }, { status: 400 });
  }

  let body: { name?: string; phone?: string | null; address?: string | null; bio?: string | null };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  // Одоогийн settings авна
  const { data: tenant, error: getErr } = await supabaseAdmin
    .from("tenants")
    .select("settings")
    .eq("id", tenantId)
    .single();
  if (getErr || !tenant) {
    return NextResponse.json({ error: getErr?.message ?? "Оффис олдсонгүй" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const settings: Record<string, unknown> = { ...((tenant as any).settings ?? {}) };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawBody = body as any;
  if ("phone" in body) {
    const v = (body.phone ?? "").toString().trim();
    settings.phone = v.length > 0 ? v.slice(0, 50) : null;
  }
  if ("address" in body) {
    const v = (body.address ?? "").toString().trim();
    settings.address = v.length > 0 ? v.slice(0, 500) : null;
  }
  if ("bio" in body) {
    const v = (body.bio ?? "").toString().trim();
    settings.bio = v.length > 0 ? v.slice(0, 5000) : null;
  }
  // Танилцуулгын нэмэлт талбарууд
  if ("tagline" in rawBody) {
    const v = (rawBody.tagline ?? "").toString().trim();
    settings.tagline = v.length > 0 ? v.slice(0, 200) : null;
  }
  if ("mission" in rawBody) {
    const v = (rawBody.mission ?? "").toString().trim();
    settings.mission = v.length > 0 ? v.slice(0, 2000) : null;
  }
  if ("services" in rawBody) {
    const arr = Array.isArray(rawBody.services) ? rawBody.services : [];
    settings.services = arr
      .map((s: unknown) => (typeof s === "string" ? s.trim() : ""))
      .filter((s: string) => s.length > 0)
      .slice(0, 30);
  }
  if ("established_year" in rawBody) {
    const n = Number(rawBody.established_year);
    settings.established_year = Number.isFinite(n) && n >= 1900 && n <= 2100 ? n : null;
  }
  if ("website" in rawBody) {
    const v = (rawBody.website ?? "").toString().trim();
    settings.website = v.length > 0 ? v.slice(0, 500) : null;
  }

  const updates: Record<string, unknown> = {
    settings,
    updated_at: new Date().toISOString(),
  };
  if (typeof body.name === "string") {
    const v = body.name.trim();
    if (v.length > 0 && v.length <= 200) updates.name = v;
  }

  const { error: updErr } = await supabaseAdmin
    .from("tenants")
    .update(updates as never)
    .eq("id", tenantId);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
