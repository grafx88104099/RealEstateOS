// PATCH /api/qr-links/[slug]
// Tenant_admin/super_admin л өөрийн tenant-ийн QR target_url-ыг солих эрхтэй.
// Public access байсан тул phishing/malware redirect aюултай байсан — auth-аар хаалаа.
import { NextRequest, NextResponse } from "next/server";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await withAuth(req, ["tenant_admin", "super_admin"]);
  if (isAuthError(auth)) return auth;

  const { slug } = await params;
  let body: { target_url?: unknown };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!body.target_url || typeof body.target_url !== "string") {
    return NextResponse.json({ error: "target_url required" }, { status: 400 });
  }
  // Валид URL шалгах + scheme cap (http/https)
  let parsed: URL;
  try {
    parsed = new URL(body.target_url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return NextResponse.json({ error: "Only http(s) allowed" }, { status: 400 });
  }

  // Эзэмшил шалгах: tenant_admin зөвхөн өөрийн tenant-ийн QR-ыг засна
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabaseAdmin as any)
    .from("qr_links")
    .select("tenant_id")
    .eq("slug", slug)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Олдсонгүй" }, { status: 404 });
  }
  if (auth.role === "tenant_admin" && existing.tenant_id !== auth.tenantId) {
    return NextResponse.json({ error: "Зөвшөөрөлгүй" }, { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin as any)
    .from("qr_links")
    .update({ target_url: parsed.toString() })
    .eq("slug", slug)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
