// POST /api/auth/register
// mode: "consumer" | "agency"
//
// consumer → platform tenant-д consumer role-тэй хэрэглэгч үүснэ
// agency   → шинэ tenant + tenant_admin хэрэглэгч үүснэ
//
// Яагаад API route вэ:
//   supabase.auth.signUp() нь public.users INSERT хийдэггүй.
//   Зөвхөн admin client-ээр users row үүсгэж чадна (supabaseAdmin).

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { email, password, full_name, mode, agency_name } = body;

  if (!email || !password || !full_name) {
    return NextResponse.json({ error: "email, password, full_name шаардлагатай" }, { status: 400 });
  }
  if (mode !== "consumer" && mode !== "agency") {
    return NextResponse.json({ error: "mode нь consumer эсвэл agency байх ёстой" }, { status: 400 });
  }
  if (mode === "agency" && !agency_name) {
    return NextResponse.json({ error: "agency_name шаардлагатай" }, { status: 400 });
  }

  // Ижил имэйл байгаа эсэхийг шалгах
  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("id, email")
    .eq("email", String(email))
    .single();

  if (existing) {
    return NextResponse.json({ error: "Энэ имэйл хаяг бүртгэлтэй байна" }, { status: 409 });
  }

  // Auth user үүсгэх
  const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email: String(email),
    password: String(password),
    email_confirm: true,
    user_metadata: { full_name: String(full_name) },
  });

  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 });

  const userId = authData.user.id;

  if (mode === "consumer") {
    // Platform tenant-д consumer role
    const platformTenantId = process.env.PLATFORM_TENANT_ID;
    if (!platformTenantId) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "PLATFORM_TENANT_ID тохируулаагүй байна" }, { status: 500 });
    }

    const { error: dbErr } = await supabaseAdmin.from("users").insert({
      id: userId,
      tenant_id: platformTenantId,
      role: "consumer",
      email: String(email),
      full_name: String(full_name),
    } as never);

    if (dbErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: dbErr.message }, { status: 500 });
    }

    return NextResponse.json({ mode: "consumer", redirect: "/consumer" }, { status: 201 });

  } else {
    // Agency mode: tenant үүсгэж, tenant_admin болгоно
    const slug = String(agency_name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) + "-" + Date.now().toString(36);

    const { data: tenant, error: tenantErr } = await supabaseAdmin
      .from("tenants")
      .insert({
        name: String(agency_name),
        slug,
      } as never)
      .select()
      .single();

    if (tenantErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: tenantErr.message }, { status: 500 });
    }

    const { error: dbErr } = await supabaseAdmin.from("users").insert({
      id: userId,
      tenant_id: (tenant as { id: string }).id,
      role: "tenant_admin",
      email: String(email),
      full_name: String(full_name),
    } as never);

    if (dbErr) {
      await supabaseAdmin.from("tenants").delete().eq("id", (tenant as { id: string }).id);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: dbErr.message }, { status: 500 });
    }

    return NextResponse.json({ mode: "agency", redirect: "/dashboard" }, { status: 201 });
  }
}
