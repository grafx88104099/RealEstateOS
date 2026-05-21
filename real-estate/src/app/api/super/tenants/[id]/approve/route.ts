// POST /api/super/tenants/[id]/approve — sa зөвшөөрөл (status='active')
import { NextRequest, NextResponse } from "next/server";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { approvedTemplate } from "@/lib/email/templates";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await withAuth(req, ["super_admin"]);
  if (isAuthError(auth)) return auth;

  const { id } = await params;

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("id, name, status")
    .eq("id", id)
    .single();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = tenant as any;
  if (!t) return NextResponse.json({ error: "Олдсонгүй" }, { status: 404 });

  // Approve хийх боломжтой статусууд: pending_approval (хэвийн), rejected (дахин нээх), suspended (сэргээх)
  if (t.status === "pending_email") {
    return NextResponse.json(
      { error: "Имэйл баталгаажаагүй байна. Эзэмшигч эхлээд имэйлээ баталгаажуулах ёстой." },
      { status: 400 },
    );
  }
  if (t.status === "active") {
    return NextResponse.json({ ok: true, message: "Аль хэдийн идэвхтэй" });
  }

  const { error } = await supabaseAdmin
    .from("tenants")
    .update({
      status: "active",
      is_active: true,
      approved_at: new Date().toISOString(),
      approved_by: auth.userId,
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Эзэмшигчид approval email илгээх
  const { data: owner } = await supabaseAdmin
    .from("users")
    .select("email, full_name")
    .eq("tenant_id", id)
    .eq("role", "tenant_admin")
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ow = owner as any;
  if (ow) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
    const tpl = approvedTemplate({
      officeName: t.name,
      ownerName: ow.full_name ?? "",
      dashboardUrl: `${siteUrl}/dashboard`,
    });
    sendEmail({ to: ow.email, subject: tpl.subject, html: tpl.html }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
