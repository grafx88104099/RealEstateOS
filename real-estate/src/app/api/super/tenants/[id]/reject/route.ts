// POST /api/super/tenants/[id]/reject — sa татгалзал (status='rejected')
// body: { reason: string }
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

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("id, name, status")
    .eq("id", id)
    .single();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = tenant as any;
  if (!t) return NextResponse.json({ error: "Олдсонгүй" }, { status: 404 });

  const { error } = await supabaseAdmin
    .from("tenants")
    .update({
      status: "rejected",
      is_active: false,
      rejection_reason: reason,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: owner } = await supabaseAdmin
    .from("users")
    .select("email, full_name")
    .eq("tenant_id", id)
    .eq("role", "tenant_admin")
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ow = owner as any;
  if (ow) {
    const tpl = rejectedTemplate({
      officeName: t.name,
      ownerName: ow.full_name ?? "",
      reason,
    });
    sendEmail({ to: ow.email, subject: tpl.subject, html: tpl.html }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
