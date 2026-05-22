// POST /api/auth/resend-verification
// Логин хийсэн tenant_admin хэрэглэгчийн tenant нь pending_email төлөвт байвал
// шинэ token үүсгээд email-ээр илгээнэ. Хуучин ашиглагдаагүй token-уудыг устгана.

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { decodeJWT } from "@/lib/utils/jwt";
import { sendEmail } from "@/lib/email/resend";
import { verifyEmailTemplate } from "@/lib/email/templates";

const RATE_LIMIT_SECONDS = 60; // ижил tenant хэт олон удаа хийхээс хамгаалах

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Нэвтрээгүй" }, { status: 401 });
  }

  const jwt = decodeJWT(session.access_token);
  const tenantId = jwt.tenant_id as string | undefined;
  const role = jwt.user_role as string | undefined;
  if (!tenantId || role !== "tenant_admin") {
    return NextResponse.json({ error: "Зөвхөн tenant_admin" }, { status: 403 });
  }

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("id, name, status")
    .eq("id", tenantId)
    .is("deleted_at", null)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = tenant as any;
  if (!t) return NextResponse.json({ error: "Олдсонгүй" }, { status: 404 });
  if (t.status !== "pending_email") {
    return NextResponse.json({ error: "Имэйл аль хэдийн баталгаажсан байна" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin: any = supabaseAdmin;

  // Rate limit: сүүлийн token-оос 60 секунд өнгөрсөн эсэх
  const { data: recent } = await admin
    .from("tenant_email_tokens")
    .select("created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recent && Date.now() - new Date(recent.created_at).getTime() < RATE_LIMIT_SECONDS * 1000) {
    return NextResponse.json(
      { error: `Дахин илгээхийг хүлээнэ үү (${RATE_LIMIT_SECONDS} секунд)` },
      { status: 429 },
    );
  }

  // Хуучин ашиглагдаагүй token-уудыг invalidate (used_at тогтоох — устгахгүй history-д үлдээнэ)
  await admin
    .from("tenant_email_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .is("used_at", null);

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await admin.from("tenant_email_tokens").insert({
    token,
    tenant_id: tenantId,
    expires_at: expiresAt,
  });

  const { data: owner } = await supabaseAdmin
    .from("users")
    .select("email, full_name")
    .eq("id", session.user.id)
    .is("deleted_at", null)
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ow = owner as any;
  if (!ow?.email) {
    return NextResponse.json({ error: "Хэрэглэгчийн мэдээлэл олдсонгүй" }, { status: 404 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const verifyUrl = `${siteUrl}/api/auth/verify-email?token=${token}`;
  const tpl = verifyEmailTemplate({
    officeName: t.name,
    ownerName: ow.full_name ?? "",
    verifyUrl,
  });

  const result = await sendEmail({ to: ow.email, subject: tpl.subject, html: tpl.html });
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Email илгээхэд алдаа" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
