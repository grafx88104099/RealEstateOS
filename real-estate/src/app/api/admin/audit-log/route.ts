// GET  /api/admin/audit-log — list audit events
// POST /api/admin/audit-log — record an audit event
// Note: audit_logs table may not exist yet — handles gracefully

import { NextRequest, NextResponse } from "next/server";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const auth = await withAuth(req, ["super_admin", "tenant_admin"]);
  if (isAuthError(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabaseAdmin as any)
      .from("audit_logs")
      .select("*")
      .eq("tenant_id", auth.tenantId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (action) query = query.eq("action", action);

    const { data, error } = await query;

    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json({ logs: [], table_missing: true });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ logs: data ?? [] });
  } catch {
    return NextResponse.json({ logs: [], table_missing: true });
  }
}

export async function POST(req: NextRequest) {
  const auth = await withAuth(req, ["super_admin", "tenant_admin", "agent"]);
  if (isAuthError(auth)) return auth;

  let body: { action: string; entity_type?: string; entity_id?: string; details?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.action) {
    return NextResponse.json({ error: "action шаардлагатай" }, { status: 400 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any).from("audit_logs").insert({
      tenant_id: auth.tenantId,
      user_id: auth.userId,
      action: body.action,
      entity_type: body.entity_type ?? null,
      entity_id: body.entity_id ?? null,
      details: body.details ?? null,
    });

    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json({ success: false, table_missing: true });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, table_missing: true });
  }
}
