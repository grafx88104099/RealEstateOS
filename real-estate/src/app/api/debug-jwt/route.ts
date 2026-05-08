import { createSupabaseServer } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Session байхгүй — нэвтэрч орно уу" });
  }

  // JWT payload decode
  const parts = session.access_token.split(".");
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());

  return NextResponse.json({
    user_id: session.user.id,
    email: session.user.email,
    jwt_claims: payload,
    has_tenant_id: !!payload.tenant_id,
    tenant_id: payload.tenant_id ?? null,
    role: payload.role ?? null,
    expires_at: new Date(payload.exp * 1000).toISOString(),
  });
}
