// GET /api/public/listings/[id] — auth шаардлагагүй listing дэлгэрэнгүй
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("listings")
    .select(`
      id, title, description, price, currency,
      rooms, bedrooms, bathrooms, area_sqm, floor, total_floors,
      built_year, has_parking, is_furnished,
      property_type, listing_type, status,
      district, address, city,
      created_at,
      agent:users!agent_id(id, full_name, email)
    `)
    .eq("id", id)
    .eq("status", "active")
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Зар олдсонгүй" }, { status: 404 });
  }

  return NextResponse.json({ listing: data });
}
