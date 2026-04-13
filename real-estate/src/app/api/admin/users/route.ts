// GET /api/admin/users — all users with optional role filter (super_admin only)

import { NextRequest, NextResponse } from "next/server";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const auth = await withAuth(req, ["super_admin"]);
  if (isAuthError(auth)) return auth;

  const url = new URL(req.url);
  const role = url.searchParams.get("role");

  let query = supabaseAdmin
    .from("users")
    .select("id, email, full_name, role, is_active, created_at, tenant_id")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(500);

  if (role) {
    query = query.eq("role", role as never);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ users: data });
}
