// POST /api/users/invite — tenant_admin агент урих
// 1. auth user үүсгэнэ (санамсаргүй нүүц үгтэй)
// 2. public.users record үүсгэнэ
// 3. Password reset link генерэйт хийнэ → агент өөрийн нүүц үгийг тохируулна

import { NextRequest, NextResponse } from "next/server";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const auth = await withAuth(req, ["tenant_admin"]);
  if (isAuthError(auth)) return auth;

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { email, full_name, role } = body;
  if (!email || !role) {
    return NextResponse.json({ error: "email болон role шаардлагатай" }, { status: 400 });
  }
  if (String(role) !== "agent") {
    return NextResponse.json({ error: "Зөвхөн agent role урих боломжтой" }, { status: 400 });
  }

  // Имэйл давхардаж байгаа эсэх
  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", String(email))
    .single();

  if (existing) {
    return NextResponse.json({ error: "Энэ имэйл хаяг бүртгэлтэй байна" }, { status: 409 });
  }

  // Auth user үүсгэх (санамсаргүй нүүц үгтэй — агент recovery link-ээр өөрийн нүүц үг тохируулна)
  const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email: String(email),
    password: crypto.randomUUID(),
    email_confirm: true,
    user_metadata: { full_name: String(full_name ?? ""), invited: true },
  });

  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 });

  const userId = authUser.user.id;

  // public.users record үүсгэх
  const { error: dbErr } = await supabaseAdmin.from("users").insert({
    id: userId,
    tenant_id: auth.tenantId,
    role: "agent",
    email: String(email),
    full_name: String(full_name ?? ""),
  } as never);

  if (dbErr) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  // Password recovery link үүсгэх
  // Агент энэ link-ээр нэвтэрч нүүц үгээ тохируулна → /auth/callback → /agent
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email: String(email),
    options: {
      redirectTo: `${siteUrl}/auth/set-password`,
    },
  });

  if (linkErr) {
    // Link үүсгэж чадахгүй ч хэрэглэгч үүссэн — алдааг л мэдэгдэнэ
    return NextResponse.json({ error: linkErr.message }, { status: 500 });
  }

  return NextResponse.json({
    user: { id: userId, email, role: "agent" },
    invite_link: linkData.properties.action_link,
  }, { status: 201 });
}
