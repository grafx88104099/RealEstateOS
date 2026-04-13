// POST /api/listings/[id]/duplicate — clone a listing as draft

import { NextRequest, NextResponse } from "next/server";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await withAuth(req, ["super_admin", "tenant_admin", "agent"]);
  if (isAuthError(auth)) return auth;

  // Fetch source listing
  const { data: source, error } = await supabaseAdmin
    .from("listings")
    .select("title, description, price, rooms, area_sqm, floor, total_floors, property_type, listing_type, district, khoroo, address, features")
    .eq("id", id)
    .eq("tenant_id", auth.tenantId)
    .single();

  if (error || !source) {
    return NextResponse.json({ error: "Зар олдсонгүй" }, { status: 404 });
  }

  const slug = `${String(source.title).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}-copy-${Date.now()}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newListing, error: insertError } = await supabaseAdmin
    .from("listings")
    .insert({
      tenant_id: auth.tenantId,
      agent_id: auth.userId,
      title: `${source.title} (хуулбар)`,
      slug,
      description: source.description,
      price: source.price,
      rooms: source.rooms,
      area_sqm: source.area_sqm,
      floor: source.floor,
      total_floors: source.total_floors,
      property_type: source.property_type,
      listing_type: source.listing_type,
      district: source.district,
      khoroo: source.khoroo,
      address: source.address,
      features: source.features ?? [],
      status: "draft",
    } as never)
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ listing_id: newListing?.id }, { status: 201 });
}
