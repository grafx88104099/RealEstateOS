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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: listing, error } = await supabaseAdmin
    .from("listings")
    .update(body as any)
    .eq("id", id)
    .eq("tenant_id", auth.tenantId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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
