// GET /api/auth/verify-email?token=...
// Race-safe: conditional UPDATE токеныг used_at IS NULL дээр шууд тэмдэглэнэ.
// Зөвхөн pending_email тенант л pending_approval-руу шилжинэ (rejected/active хэвээр үлдэнэ).

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import {
  applicationReceivedTemplate,
  superAdminNotifyTemplate,
} from "@/lib/email/templates";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || url.origin;

  if (!token) {
    return NextResponse.redirect(`${siteUrl}/verify-email?error=missing`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin: any = supabaseAdmin;

  // 1. Race-safe: токеныг used_at IS NULL дээр шууд update хийгээд буцаасан мөрийг шалгана
  const nowIso = new Date().toISOString();
  const { data: claimed } = await admin
    .from("tenant_email_tokens")
    .update({ used_at: nowIso })
    .eq("token", token)
    .is("used_at", null)
    .select("token, tenant_id, expires_at")
    .maybeSingle();

  if (!claimed) {
    // Token байхгүй эсвэл аль хэдийн ашигласан — ялгахын тулд select хийнэ
    const { data: exists } = await admin
      .from("tenant_email_tokens")
      .select("used_at, expires_at")
      .eq("token", token)
      .maybeSingle();
    if (!exists) return NextResponse.redirect(`${siteUrl}/verify-email?error=invalid`);
    if (exists.used_at) return NextResponse.redirect(`${siteUrl}/verify-email?error=used`);
    return NextResponse.redirect(`${siteUrl}/verify-email?error=expired`);
  }

  // 2. Хугацаа дууссан эсэхийг шалгана (claim хийсний дараа гэхдээ token-ыг устгахгүй)
  if (new Date(claimed.expires_at).getTime() < Date.now()) {
    return NextResponse.redirect(`${siteUrl}/verify-email?error=expired`);
  }

  // 3. Tenant-ыг шалгах: deleted_at IS NULL ба status = 'pending_email' үед л шилжинэ
  const { data: tenant } = await admin
    .from("tenants")
    .update({
      status: "pending_approval",
      email_verified_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", claimed.tenant_id)
    .eq("status", "pending_email")
    .is("deleted_at", null)
    .select("id, name, applicant_phone, applicant_message")
    .maybeSingle();

  if (!tenant) {
    // Хэдийн verify хийсэн / татгалзсан / устгасан tenant. Token already claimed гэдгийг
    // хэрэглэгчид мэдэгдэхийн тулд ok=1 буцаана — нууцалсан зүйл үгүй.
    return NextResponse.redirect(`${siteUrl}/verify-email?ok=1`);
  }

  // 4. Имэйл илгээх (sync хийхгүй — алдаа production-руу bubble хийхгүй)
  const { data: owner } = await admin
    .from("users")
    .select("email, full_name")
    .eq("tenant_id", tenant.id)
    .eq("role", "tenant_admin")
    .is("deleted_at", null)
    .maybeSingle();

  if (owner) {
    const recv = applicationReceivedTemplate({
      officeName: tenant.name,
      ownerName: owner.full_name ?? "",
    });
    sendEmail({ to: owner.email, subject: recv.subject, html: recv.html }).catch(() => {});

    const saEmail = process.env.SUPER_ADMIN_NOTIFY_EMAIL;
    if (saEmail) {
      const reviewUrl = `${siteUrl}/super/tenants/${tenant.id}`;
      const notif = superAdminNotifyTemplate({
        officeName: tenant.name,
        ownerName: owner.full_name ?? "",
        ownerEmail: owner.email,
        reviewUrl,
        phone: tenant.applicant_phone ?? undefined,
        message: tenant.applicant_message ?? undefined,
      });
      sendEmail({ to: saEmail, subject: notif.subject, html: notif.html }).catch(() => {});
    } else {
      console.warn(
        "[verify-email] SUPER_ADMIN_NOTIFY_EMAIL дутуу — sa-руу мэдэгдэл явсангүй",
        { tenantId: tenant.id },
      );
    }
  }

  return NextResponse.redirect(`${siteUrl}/verify-email?ok=1`);
}
