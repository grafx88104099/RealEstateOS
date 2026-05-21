// POST /api/super/tenants/[id]/reject — sa татгалзал
// Зөвхөн pending_approval төлвөөс татгалзаж болно (active tenant-ыг "татгалзах" логикгүй).
// Active tenant-ыг хаах бол PATCH /api/super/tenants/[id] { status: "suspended" } ашиглана.

import { NextRequest, NextResponse } from "next/server";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { rejectedTemplate } from "@/lib/email/templates";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await withAuth(req, ["super_admin"]);
  if (isAuthError(auth)) return auth;

  const { id } = await params;

  let body: { reason?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const reason = (body.reason ?? "").trim();
  if (!reason) {
    return NextResponse.json({ error: "Татгалзах шалтгаан шаардлагатай" }, { status: 400 });
  }
  if (reason.length > 1000) {
    return NextResponse.json({ error: "Шалтгаан 1000 тэмдэгтээс хэтрэхгүй" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin: any = supabaseAdmin;

  const { data: tenant } = await admin
    .from("tenants")
    .select("id, name, status")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  if (!tenant) return NextResponse.json({ error: "Олдсонгүй" }, { status: 404 });

  if (tenant.status !== "pending_approval") {
    return NextResponse.json(
      { error: `Татгалзах боломжгүй: одоогийн төлөв ${tenant.status}. Идэвхтэй оффисыг хаахын тулд "Түр хаах" ашиглана уу.` },
      { status: 400 },
    );
  }

  const nowIso = new Date().toISOString();
  const { error } = await admin
    .from("tenants")
    .update({
      status: "rejected",
      rejection_reason: reason,
      updated_at: nowIso,
    })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Хуучин token-уудыг invalidate — rejected tenant хуучин token дарвал бид pending_email-аас
  // шилжихгүй (verify-email guard) гэхдээ token цэвэрхэн байх нь log спам багасгана
  await admin
    .from("tenant_email_tokens")
    .update({ used_at: nowIso })
    .eq("tenant_id", id)
    .is("used_at", null);

  const { data: owner } = await admin
    .from("users")
    .select("email, full_name")
    .eq("tenant_id", id)
    .eq("role", "tenant_admin")
    .is("deleted_at", null)
    .maybeSingle();
  if (owner) {
    const tpl = rejectedTemplate({
      officeName: tenant.name,
      ownerName: owner.full_name ?? "",
      reason,
    });
    sendEmail({ to: owner.email, subject: tpl.subject, html: tpl.html }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
