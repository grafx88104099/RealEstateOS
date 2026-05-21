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
