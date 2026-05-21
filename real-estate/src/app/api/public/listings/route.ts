// GET /api/public/listings — auth шаардлагагүй, active listings жагсаалт
// Pagination: ?page=1&limit=24 (max 50). Total count буцаана.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const COLS = "id, title, price, rooms, area_sqm, floor, total_floors, property_type, listing_type, district, address, created_at, lat, lng";

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 24;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const district = searchParams.get("district");
  const listingType = searchParams.get("listing_type");
  const propertyType = searchParams.get("property_type");
  const maxPrice = searchParams.get("max_price");
  const minRooms = searchParams.get("min_rooms");

  // Pagination
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") ?? `${DEFAULT_LIMIT}`, 10) || DEFAULT_LIMIT));
  const offset = (page - 1) * limit;

  // status='active' implicitly excludes draft / pending_review / rejected /
  // sold / rented / archived. deleted_at IS NULL excludes soft-deleted.
  let query = supabaseAdmin
    .from("listings")
    .select(COLS, { count: "exact" })
    .eq("status", "active")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (district) query = query.eq("district", district);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (listingType) query = (query as any).eq("listing_type", listingType);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (propertyType) query = (query as any).eq("property_type", propertyType);
  if (maxPrice) query = query.lte("price", Number(maxPrice));
  if (minRooms) query = query.gte("rooms", Number(minRooms));

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Cover image-ийг ганц query-аар авна (зөвхөн cover, бусад зургийг хуудаст ачаалахгүй)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as any[];
  const ids = rows.map((r) => r.id as string);
  const coverByListing = new Map<string, string>();
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

  const enriched = rows.map((r) => ({
    ...r,
    cover_image_url: coverByListing.get(r.id as string) ?? null,
  }));

  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({
    listings: enriched,
    pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
  });
}
