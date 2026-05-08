// GET /auth/callback — Supabase OAuth callback handler
// Google-аар нэвтэрсний дараа энд ирнэ
// 1. code → session солих
// 2. public.users байхгүй бол consumer үүсгэх
// 3. role-оор redirect хийх

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { decodeJWT, ROLE_HOME, AllowedRole } from "@/lib/utils/jwt";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  // Hash fragment-д алдаа байвал (expired/invalid link)
  const errorCode = searchParams.get("error_code");
  const errorDesc = searchParams.get("error_description");
  if (errorCode || searchParams.get("error")) {
    const msg = errorCode === "otp_expired"
      ? "Урилгын холбоосын хугацаа дууссан байна. Шинэ урилга авна уу."
      : (errorDesc ?? "Холбоос буруу байна");
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(msg)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Холбоос буруу байна. Дахин оролдоно уу.")}`);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.redirect(`${origin}/login?error=no_session`);
  }

  // public.users байгаа эсэхийг шалгах
  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("id, role")
    .eq("id", session.user.id)
    .single();

  if (!existing) {
    // Шинэ Google хэрэглэгч → platform tenant-д consumer үүсгэх
    const platformTenantId = process.env.PLATFORM_TENANT_ID!;
    const fullName =
      session.user.user_metadata?.full_name ||
      session.user.user_metadata?.name ||
      session.user.email?.split("@")[0] ||
      "Хэрэглэгч";

    await supabaseAdmin.from("users").insert({
      id: session.user.id,
      tenant_id: platformTenantId,
      role: "consumer",
      email: session.user.email!,
      full_name: fullName,
    } as never);

    // Шинэ хэрэглэгч → consumer home
    return NextResponse.redirect(`${origin}/consumer`);
  }

  // Байгаа хэрэглэгч → role-оор redirect
  const payload = decodeJWT(session.access_token);
  const role = payload.user_role as AllowedRole | undefined;
  const home = (role && ROLE_HOME[role]) ? ROLE_HOME[role] : "/consumer";

  if (next !== "/") {
    return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}${home}`);
}
