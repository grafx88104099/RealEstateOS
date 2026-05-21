// lib/middleware/auth.ts
// Extract tenant_id and role from Supabase JWT for API routes

import { createSupabaseServer } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { decodeJWT, AllowedRole } from "@/lib/utils/jwt";

export type { AllowedRole };

export interface AuthContext {
  userId: string;
  tenantId: string;
  role: AllowedRole;
}

export async function withAuth(
  req: NextRequest,
  allowedRoles: AllowedRole[]
): Promise<AuthContext | NextResponse> {
  // CSRF guard — state-changing хүсэлтийн Origin/Referer нь манай domain-аас ирсэн эсэхийг шалгана.
  // Lax cookie default нь top-level form POST-ыг хааж чадахгүй.
  const method = req.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    const origin = req.headers.get("origin") ?? "";
    const referer = req.headers.get("referer") ?? "";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const allowedOrigins = new Set<string>(
      [
        siteUrl,
        "http://localhost:3000",
        "http://localhost:62486",
      ].filter(Boolean),
    );

    let valid = false;
    if (origin && allowedOrigins.has(origin)) valid = true;
    else if (referer) {
      try {
        const refOrigin = new URL(referer).origin;
        if (allowedOrigins.has(refOrigin)) valid = true;
      } catch {/* invalid referer */}
    }
    // Хоёулаа байхгүй — same-origin fetch гэж үздэг (mobile app зэрэгт түвэгтэй болохоос сэргийлнэ)
    if (!origin && !referer) valid = true;

    if (!valid) {
      return NextResponse.json({ error: "Origin mismatch" }, { status: 403 });
    }
  }

  const supabase = await createSupabaseServer();

  // getUser() — token-ыг Supabase Auth-руу хүсэлт явуулж баталгаажуулна (getSession() нь cookie уншдаг тул spoof-д өртөмтгий)
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Session-ийг JWT claim-уудыг авахын тулд авна (custom hook-аар user_role/tenant_id оруулсан)
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = decodeJWT(session.access_token);

  const tenantId = payload.tenant_id as string | undefined;
  const role = payload.user_role as AllowedRole | undefined;
  const userId = user.id;

  if (!tenantId) {
    return NextResponse.json({ error: "No tenant assigned" }, { status: 403 });
  }

  if (!role || !allowedRoles.includes(role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  return { userId, tenantId, role };
}

// Type guard helper
export function isAuthError(
  result: AuthContext | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
