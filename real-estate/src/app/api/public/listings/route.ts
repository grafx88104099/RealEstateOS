// GET /api/public/listings — auth шаардлагагүй, active listings жагсаалт
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const district = searchParams.get("district");
  const listingType = searchParams.get("listing_type");
  const propertyType = searchParams.get("property_type");
  const maxPrice = searchParams.get("max_price");
  const minRooms = searchParams.get("min_rooms");

  let query = supabaseAdmin
    .from("listings")
    .select("id, title, price, rooms, area_sqm, floor, total_floors, property_type, listing_type, district, address, created_at")
    .eq("status", "active")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(60);

  if (district) query = query.eq("district", district);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (listingType) query = (query as any).eq("listing_type", listingType);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (propertyType) query = (query as any).eq("property_type", propertyType);
  if (maxPrice) query = query.lte("price", Number(maxPrice));
  if (minRooms) query = query.gte("rooms", Number(minRooms));

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ listings: data ?? [] });
}
