// GET /api/auth/verify-email?token=...
// Token-ыг шалгаж tenant.status='pending_approval' болгоно.
// Хариу: redirect /verify-email?ok=1 эсвэл /verify-email?error=...

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

  const { data: row } = await supabaseAdmin
    .from("tenant_email_tokens")
    .select("token, tenant_id, expires_at, used_at")
    .eq("token", token)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = row as any;
  if (!t) return NextResponse.redirect(`${siteUrl}/verify-email?error=invalid`);
  if (t.used_at) return NextResponse.redirect(`${siteUrl}/verify-email?error=used`);
  if (new Date(t.expires_at).getTime() < Date.now()) {
    return NextResponse.redirect(`${siteUrl}/verify-email?error=expired`);
  }

  // Token хэрэглэгдсэн гэж тэмдэглэх
  await supabaseAdmin
    .from("tenant_email_tokens")
    .update({ used_at: new Date().toISOString() } as never)
    .eq("token", token);

  // Tenant status шинэчлэх
  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .update({
      status: "pending_approval",
      email_verified_at: new Date().toISOString(),
    } as never)
    .eq("id", t.tenant_id)
    .select("id, name, applicant_phone, applicant_message")
    .single();

  // tenant_admin хэрэглэгчийг олж confirmation email + sa notification илгээх
  const { data: owner } = await supabaseAdmin
    .from("users")
    .select("email, full_name")
    .eq("tenant_id", t.tenant_id)
    .eq("role", "tenant_admin")
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ow = owner as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tn = tenant as any;

  if (ow && tn) {
    const recv = applicationReceivedTemplate({
      officeName: tn.name,
      ownerName: ow.full_name ?? "",
    });
    sendEmail({ to: ow.email, subject: recv.subject, html: recv.html }).catch(() => {});

    const saEmail = process.env.SUPER_ADMIN_NOTIFY_EMAIL;
    if (saEmail) {
      const reviewUrl = `${siteUrl}/super/tenants/${tn.id}`;
      const notif = superAdminNotifyTemplate({
        officeName: tn.name,
        ownerName: ow.full_name ?? "",
        ownerEmail: ow.email,
        reviewUrl,
        phone: tn.applicant_phone ?? undefined,
        message: tn.applicant_message ?? undefined,
      });
      sendEmail({ to: saEmail, subject: notif.subject, html: notif.html }).catch(() => {});
    }
  }

  return NextResponse.redirect(`${siteUrl}/verify-email?ok=1`);
}
