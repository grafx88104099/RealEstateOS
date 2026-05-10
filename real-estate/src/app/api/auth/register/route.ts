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

  // Ижил имэйл байгаа эсэхийг шалгах. Бүртгэлтэй бол одоогийн role-оор тохирох мэдээлэл буцаана.
  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("id, email, role")
    .eq("email", String(email))
    .maybeSingle();

  if (existing) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingRole = (existing as any).role as string;
    const labels: Record<string, string> = {
      agent: "оффисын агент",
      tenant_admin: "оффисын админ",
      super_admin: "системийн админ",
      consumer: "энгийн хэрэглэгч",
    };
    const label = labels[existingRole] ?? existingRole;
    if (mode === "consumer" && existingRole !== "consumer") {
      return NextResponse.json({
        error: `Энэ имэйл хаягаар ${label}-ийн бүртгэлтэй байна. Энгийн хэрэглэгчийн бүртгэл үүсгэхийн тулд өөр имэйл хаяг ашиглана уу.`,
      }, { status: 409 });
    }
    if (mode === "agency" && existingRole === "consumer") {
      return NextResponse.json({
        error: "Энэ имэйл хаягаар энгийн хэрэглэгчийн бүртгэлтэй байна. Шинэ оффис нээхийн тулд өөр имэйл хаяг ашиглана уу.",
      }, { status: 409 });
    }
    return NextResponse.json({
      error: `Энэ имэйл хаягаар ${label}-ийн бүртгэлтэй байна.`,
    }, { status: 409 });
  }

  // Auth user үүсгэх. Хэрэв өмнө supabase.auth.signUp-ээр үүссэн боловч public.users
  // row үүсээгүй "stuck" хэрэглэгч байвал тэрхүү auth row-ыг устгаад дахин үүсгэнэ.
  let userId: string;
  {
    const { data: authData, error: authErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: String(email),
        password: String(password),
        email_confirm: true,
        user_metadata: { full_name: String(full_name) },
      });

    if (authErr) {
      const msg = authErr.message?.toLowerCase() ?? "";
      const looksLikeDuplicate =
        msg.includes("already") ||
        msg.includes("registered") ||
        msg.includes("exists");

      if (!looksLikeDuplicate) {
        return NextResponse.json({ error: authErr.message }, { status: 500 });
      }

      // Stuck auth user-ийг олж устгаад дахин үүсгэнэ
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      const stuck = list?.users.find(
        (u) => u.email?.toLowerCase() === String(email).toLowerCase(),
      );
      if (!stuck) {
        return NextResponse.json({ error: authErr.message }, { status: 500 });
      }
      await supabaseAdmin.auth.admin.deleteUser(stuck.id);

      const retry = await supabaseAdmin.auth.admin.createUser({
        email: String(email),
        password: String(password),
        email_confirm: true,
        user_metadata: { full_name: String(full_name) },
      });
      if (retry.error || !retry.data.user) {
        return NextResponse.json(
          { error: retry.error?.message ?? "Auth user retry failed" },
          { status: 500 },
        );
      }
      userId = retry.data.user.id;
    } else {
      userId = authData.user.id;
    }
  }

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
