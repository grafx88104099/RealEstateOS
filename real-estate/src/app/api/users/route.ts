// GET /api/users — list tenant users (tenant_admin only)

import { NextRequest, NextResponse } from "next/server";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const auth = await withAuth(req, ["super_admin", "tenant_admin"]);
  if (isAuthError(auth)) return auth;

  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from("users")
    .select("id, email, full_name, role, is_active, created_at")
    .eq("tenant_id", auth.tenantId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data });
}
