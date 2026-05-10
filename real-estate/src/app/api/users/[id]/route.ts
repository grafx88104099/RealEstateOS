// PATCH /api/users/[id] — is_active toggle
//   - tenant_admin: only their own tenant's non-admin users
//   - super_admin: any user across all tenants
// DELETE /api/users/[id] — soft delete user (tenant_admin only)

import { NextRequest, NextResponse } from "next/server";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await withAuth(req, ["tenant_admin", "super_admin"]);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { data: target } = await supabaseAdmin
    .from("users")
    .select("id, tenant_id, role")
    .eq("id", id)
    .single();

  if (!target) {
    return NextResponse.json({ error: "Олдсонгүй" }, { status: 404 });
  }

  // tenant_admin зөвхөн өөрийн tenant-ийн non-admin хэрэглэгчдийг засна
  if (auth.role === "tenant_admin") {
    if (target.tenant_id !== auth.tenantId) {
      return NextResponse.json({ error: "Олдсонгүй" }, { status: 404 });
    }
    if (target.role === "tenant_admin") {
      return NextResponse.json({ error: "Оффисын админыг өөрчилж болохгүй" }, { status: 403 });
    }
  }

  // super_admin өөрийгөө хаах ёсгүй
  if (auth.role === "super_admin" && target.role === "super_admin" && body.is_active === false) {
    return NextResponse.json({ error: "Super admin-ийг хаах боломжгүй" }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from("users")
    .update({ is_active: body.is_active as boolean })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await withAuth(req, ["tenant_admin"]);
  if (isAuthError(auth)) return auth;

  const { id } = await params;

  // Зөвхөн өөрийн tenant-ийн хэрэглэгчид устгах боломжтой
  const { data: target } = await supabaseAdmin
    .from("users")
    .select("id, tenant_id, role")
    .eq("id", id)
    .single();

  if (!target || target.tenant_id !== auth.tenantId) {
    return NextResponse.json({ error: "Олдсонгүй" }, { status: 404 });
  }
  if (target.role === "tenant_admin") {
    return NextResponse.json({ error: "Оффисын админыг устгаж болохгүй" }, { status: 403 });
  }

  // public.users устгах (listings/inquiries FK байвал cascade эсвэл set null хийнэ)
  await supabaseAdmin.from("users").delete().eq("id", id);

  // auth.users-аас бүрэн устгах — имэйл суллагдана, дахин бүртгэх боломжтой
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
