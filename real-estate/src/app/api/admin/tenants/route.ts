// GET   /api/admin/tenants — all tenants (super_admin only)
// PATCH /api/admin/tenants — update tenant settings (tenant_admin+)

import { NextRequest, NextResponse } from "next/server";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const auth = await withAuth(req, ["super_admin"]);
  if (isAuthError(auth)) return auth;

  const { data, error } = await supabaseAdmin
    .from("tenants")
    .select("id, name, slug, subscription, is_active, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ tenants: data });
}

export async function PATCH(req: NextRequest) {
  const auth = await withAuth(req, ["super_admin", "tenant_admin"]);
  if (isAuthError(auth)) return auth;

  let body: { tenant_id?: string; settings?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const targetTenantId = body.tenant_id ?? auth.tenantId;

  // tenant_admin can only update their own tenant
  if (auth.role === "tenant_admin" && targetTenantId !== auth.tenantId) {
    return NextResponse.json({ error: "Зөвхөн өөрийн оффисын тохиргоо" }, { status: 403 });
  }

  if (!body.settings) {
    return NextResponse.json({ error: "settings шаардлагатай" }, { status: 400 });
  }

  // Merge new settings with existing
  const { data: existing } = await supabaseAdmin
    .from("tenants")
    .select("settings")
    .eq("id", targetTenantId)
    .single();

  const currentSettings = (existing?.settings ?? {}) as Record<string, unknown>;
  const mergedSettings = { ...currentSettings, ...body.settings };

  const { error } = await supabaseAdmin
    .from("tenants")
    .update({ settings: mergedSettings } as never)
    .eq("id", targetTenantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, settings: mergedSettings });
}
