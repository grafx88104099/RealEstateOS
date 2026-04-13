// POST /api/listings — create listing + auto-embed
// GET  /api/listings — list tenant's listings

import { NextRequest, NextResponse } from "next/server";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { embedAndStoreListing } from "@/lib/ai/embedding";

export async function GET(req: NextRequest) {
  const auth = await withAuth(req, ["super_admin", "tenant_admin", "agent", "consumer"]);
  if (isAuthError(auth)) return auth;

  const supabase = await createSupabaseServer();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("listings")
    .select("id, title, slug, status, price, rooms, area_sqm, district, property_type, listing_type, created_at", { count: "exact" })
    .eq("tenant_id", auth.tenantId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status as never);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ listings: data, total: count, page, limit });
}

export async function POST(req: NextRequest) {
  const auth = await withAuth(req, ["super_admin", "tenant_admin", "agent"]);
  if (isAuthError(auth)) return auth;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { title, description, price, rooms, area_sqm, floor, total_floors,
          property_type, listing_type, district, khoroo, address, features } = body;

  if (!title || !price) {
    return NextResponse.json({ error: "title болон price шаардлагатай" }, { status: 400 });
  }

  const slug = `${String(title).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}-${Date.now()}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insertPayload: any = {
    tenant_id: auth.tenantId,
    agent_id: auth.userId,
    title: String(title),
    slug,
    description: description ? String(description) : null,
    price: Number(price),
    rooms: rooms ? Number(rooms) : null,
    area_sqm: area_sqm ? Number(area_sqm) : null,
    floor: floor ? Number(floor) : null,
    total_floors: total_floors ? Number(total_floors) : null,
    property_type: (property_type as string) ?? "apartment",
    listing_type: (listing_type as string) ?? "sale",
    district: district ? String(district) : null,
    khoroo: khoroo ? String(khoroo) : null,
    address: address ? String(address) : null,
    features: features ?? [],
    status: "active",
    published_at: new Date().toISOString(),
  };

  const { data: listing, error } = await supabaseAdmin
    .from("listings")
    .insert(insertPayload)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Async embedding — хариу хүлээлгүй
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
  ).catch((err) => console.error("Embedding failed:", err));

  return NextResponse.json({ listing }, { status: 201 });
}
