// GET    /api/listings/[id]
// PATCH  /api/listings/[id]
// DELETE /api/listings/[id]

import { NextRequest, NextResponse } from "next/server";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { embedAndStoreListing } from "@/lib/ai/embedding";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const auth = await withAuth(req, ["super_admin", "tenant_admin", "agent", "consumer"]);
  if (isAuthError(auth)) return auth;

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) return NextResponse.json({ error: "Зар олдсонгүй" }, { status: 404 });
  return NextResponse.json({ listing: data });
}

// Whitelist of fields agents/tenant_admins/super_admins can mutate.
// Хатуу зөвшөөрөгдсөн талбарууд — tenant_id, agent_id, status (admin-only), featured зэргийг хасна.
const AGENT_EDITABLE_FIELDS = new Set([
  "title", "description", "price", "currency",
  "property_type", "listing_type", "address", "district", "khoroo",
  "rooms", "area_sqm", "floor", "total_floors", "year_built",
  "features", "latitude", "longitude",
]);
// tenant_admin/super_admin нэмж эдгээрийг солих эрхтэй
const ADMIN_EXTRA_FIELDS = new Set(["status", "featured", "featured_until", "agent_id"]);
// Хэзээ ч client-ээс шууд солихыг зөвшөөрөхгүй талбарууд (mass assignment hardening)
const FORBIDDEN_FIELDS = new Set([
  "id", "tenant_id", "created_at", "updated_at", "deleted_at",
  "view_count", "moderation_status", "moderation_reason", "moderated_by",
  "published_at", "slug", "embedding", "scrape_source", "scrape_url",
]);

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const auth = await withAuth(req, ["super_admin", "tenant_admin", "agent"]);
  if (isAuthError(auth)) return auth;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const isAdmin = auth.role === "super_admin" || auth.role === "tenant_admin";
  const allowed = isAdmin
    ? new Set([...AGENT_EDITABLE_FIELDS, ...ADMIN_EXTRA_FIELDS])
    : AGENT_EDITABLE_FIELDS;

  // Whitelist filter — зөвшөөрөгдсөн талбаруудыг л шилжүүлнэ
  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (FORBIDDEN_FIELDS.has(k)) {
      return NextResponse.json({ error: `'${k}' талбарыг өөрчилж болохгүй` }, { status: 400 });
    }
    if (allowed.has(k)) updates[k] = v;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Засах талбар алга" }, { status: 400 });
  }
  updates.updated_at = new Date().toISOString();

  // Optimistic locking — body.version хэрэглэгчээс ирвэл түүгээр concurrency шалгана
  const clientVersion = typeof body.version === "number" ? body.version : undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (updates as any).version = (clientVersion ?? 0) + 1;

  // Agent зөвхөн өөрийн listing-ыг засах боломжтой (нэмэлт хамгаалалт)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (supabaseAdmin as any).from("listings").update(updates).eq("id", id).is("deleted_at", null);
  if (clientVersion !== undefined) q = q.eq("version", clientVersion);
  if (auth.role !== "super_admin") q = q.eq("tenant_id", auth.tenantId);
  if (auth.role === "agent") q = q.eq("agent_id", auth.userId);

  const { data: listing, error } = await q.select().maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!listing) {
    // Версон таарсангүй буюу access-гүй
    return NextResponse.json(
      { error: "Зар өөрчлөгдсөн эсвэл засах эрхгүй байна. Хуудсыг сэргээж дахин оролдоно уу." },
      { status: 409 },
    );
  }

  // Re-embed засварласан зар
  embedAndStoreListing(
    {
      id: listing.id,
      title: listing.title,
      description: listing.description,
      district: listing.district,
      address: listing.address,
      price: listing.price,
      rooms: listing.rooms,
      property_type: listing.property_type,
      area_sqm: listing.area_sqm ? Number(listing.area_sqm) : null,
      floor: listing.floor,
      total_floors: listing.total_floors,
      features: Array.isArray(listing.features) ? listing.features as string[] : [],
    },
    supabaseAdmin
  ).catch((err) => console.error("Re-embed failed:", err));

  return NextResponse.json({ listing });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const auth = await withAuth(req, ["super_admin", "tenant_admin"]);
  if (isAuthError(auth)) return auth;

  const { error } = await supabaseAdmin
    .from("listings")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ deleted_at: new Date().toISOString(), status: "archived" } as any)
    .eq("id", id)
    .eq("tenant_id", auth.tenantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
