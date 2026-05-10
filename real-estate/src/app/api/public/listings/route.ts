// GET /api/public/listings — auth шаардлагагүй, active listings жагсаалт
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const BASE_COLS =
  "id, title, price, rooms, area_sqm, floor, total_floors, property_type, listing_type, district, address, created_at";

const COLS_WITH_GEO = `${BASE_COLS}, lat, lng`;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const district = searchParams.get("district");
  const listingType = searchParams.get("listing_type");
  const propertyType = searchParams.get("property_type");
  const maxPrice = searchParams.get("max_price");
  const minRooms = searchParams.get("min_rooms");

  // Try with lat/lng first; if migration not applied yet, retry without.
  for (const cols of [COLS_WITH_GEO, BASE_COLS]) {
    // status='active' implicitly excludes draft / pending_review / rejected /
    // sold / rented / archived. deleted_at IS NULL excludes soft-deleted.
    let query = supabaseAdmin
      .from("listings")
      .select(cols)
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
    if (error) {
      const msg = error.message ?? "";
      const missingGeo =
        cols === COLS_WITH_GEO &&
        (msg.includes("lat") || msg.includes("lng") || msg.includes("column"));
      if (missingGeo) continue;
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    // Fetch cover images in a separate query and merge.
    const ids = (data ?? []).map((r) => (r as { id: string }).id);
    let coverByListing = new Map<string, string>();
    if (ids.length > 0) {
      const { data: imgs } = await supabaseAdmin
        .from("listing_images")
        .select("listing_id, url, is_cover, sort_order")
        .in("listing_id", ids)
        .is("deleted_at", null)
        .order("is_cover", { ascending: false })
        .order("sort_order", { ascending: true });
      for (const row of (imgs ?? []) as { listing_id: string; url: string }[]) {
        if (!coverByListing.has(row.listing_id)) {
          coverByListing.set(row.listing_id, row.url);
        }
      }
    }
    const enriched = (data ?? []).map((r) => {
      const id = (r as { id: string }).id;
      return { ...r, cover_image_url: coverByListing.get(id) ?? null };
    });
    return NextResponse.json({ listings: enriched });
  }

  return NextResponse.json({ listings: [] });
}
