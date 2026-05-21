// POST /api/super/tenants/[id]/approve — sa зөвшөөрөл
// Шилжих status-ууд:
//   pending_approval → active (анхны approval — approved_at/by бичигдэнэ)
//   rejected         → active (дахин нээх — approved_at/by шинэчлэгдэнэ)
//   suspended        → active (сэргээх — approved_at/by *хадгалагдана*, audit trail алдагдахгүй)

import { NextRequest, NextResponse } from "next/server";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { approvedTemplate } from "@/lib/email/templates";

const ALLOWED_FROM = new Set(["pending_approval", "rejected", "suspended"]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await withAuth(req, ["super_admin"]);
  if (isAuthError(auth)) return auth;

  const { id } = await params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin: any = supabaseAdmin;

  const { data: tenant } = await admin
    .from("tenants")
    .select("id, name, status")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  if (!tenant) return NextResponse.json({ error: "Олдсонгүй" }, { status: 404 });

  if (tenant.status === "pending_email") {
    return NextResponse.json(
      { error: "Имэйл баталгаажаагүй байна. Эзэмшигч эхлээд имэйлээ баталгаажуулах ёстой." },
      { status: 400 },
    );
  }
  if (tenant.status === "active") {
    return NextResponse.json({ ok: true, message: "Аль хэдийн идэвхтэй" });
  }
  if (!ALLOWED_FROM.has(tenant.status)) {
    return NextResponse.json({ error: `Энэ төлвөөс зөвшөөрөх боломжгүй: ${tenant.status}` }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  const updates: Record<string, unknown> = {
    status: "active",
    rejection_reason: null,
    updated_at: nowIso,
  };

  // approved_at/by-ийг зөвхөн pending_approval эсвэл rejected-аас шилжихэд бичнэ.
  // Suspended → active нь "reactivate" — анхны approval audit trail хадгалагдана.
  if (tenant.status === "pending_approval" || tenant.status === "rejected") {
    updates.approved_at = nowIso;
    updates.approved_by = auth.userId;
  }

  const { error } = await admin.from("tenants").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Хуучин ашиглагдаагүй verify token-уудыг invalidate (хэрэгтэй биш болсон)
  await admin
    .from("tenant_email_tokens")
    .update({ used_at: nowIso })
    .eq("tenant_id", id)
    .is("used_at", null);

  // Эзэмшигчид approval email
  const { data: owner } = await admin
    .from("users")
    .select("email, full_name")
    .eq("tenant_id", id)
    .eq("role", "tenant_admin")
    .is("deleted_at", null)
    .maybeSingle();
  if (owner) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
    const tpl = approvedTemplate({
      officeName: tenant.name,
      ownerName: owner.full_name ?? "",
      dashboardUrl: `${siteUrl}/dashboard`,
    });
    sendEmail({ to: owner.email, subject: tpl.subject, html: tpl.html }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
