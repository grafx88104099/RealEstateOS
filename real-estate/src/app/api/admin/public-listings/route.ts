// GET /api/admin/public-listings
// Cross-tenant listing index for super_admin moderation.
// No tenant scoping — supabaseAdmin bypasses RLS.
//
// Query params:
//   status, tenant_id, district, property_type, listing_type,
//   price_min, price_max, has_coords, has_images, date_from, date_to,
//   featured, q, page (1-based), sort

import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { supabaseAdmin as typedAdmin } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAdmin = typedAdmin as unknown as SupabaseClient<any, any, any>;

const PAGE_SIZE = 30;

const SORT_MAP: Record<string, { col: string; asc: boolean }> = {
  newest: { col: "created_at", asc: false },
  oldest: { col: "created_at", asc: true },
  price_desc: { col: "price", asc: false },
  price_asc: { col: "price", asc: true },
  views_desc: { col: "view_count", asc: false },
};

export async function GET(req: NextRequest) {
  const auth = await withAuth(req, ["super_admin"]);
  if (isAuthError(auth)) return auth;

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");
  const tenantId = sp.get("tenant_id");
  const district = sp.get("district");
  const propertyType = sp.get("property_type");
  const listingType = sp.get("listing_type");
  const priceMin = sp.get("price_min");
  const priceMax = sp.get("price_max");
  const dateFrom = sp.get("date_from");
  const dateTo = sp.get("date_to");
  const hasCoords = sp.get("has_coords");
  const hasImages = sp.get("has_images");
  const featured = sp.get("featured");
  const q = sp.get("q")?.trim();
  const page = Math.max(1, Number(sp.get("page") ?? "1"));
  const sortKey = sp.get("sort") ?? "newest";
  const sort = SORT_MAP[sortKey] ?? SORT_MAP.newest;
  const includeDeleted = sp.get("include_deleted") === "1";

  const offset = (page - 1) * PAGE_SIZE;

  let query = supabaseAdmin
    .from("listings")
    .select(
      `id, title, price, rooms, area_sqm, district, address, lat, lng,
       status, featured, featured_until, view_count,
       property_type, listing_type, created_at, published_at,
       moderation_reviewed_at, rejected_reason, deleted_at,
       tenant:tenants(id, name, slug),
       agent:users!agent_id(id, full_name, email)`,
      { count: "exact" },
    )
    .order(sort.col, { ascending: sort.asc })
    .range(offset, offset + PAGE_SIZE - 1);

  if (!includeDeleted) query = query.is("deleted_at", null);
  if (status) query = query.eq("status", status);
  if (tenantId) query = query.eq("tenant_id", tenantId);
  if (district) query = query.eq("district", district);
  if (propertyType) query = query.eq("property_type", propertyType);
  if (listingType) query = query.eq("listing_type", listingType);
  if (priceMin) query = query.gte("price", Number(priceMin));
  if (priceMax) query = query.lte("price", Number(priceMax));
  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo) query = query.lte("created_at", dateTo);
  if (hasCoords === "1") query = query.not("lat", "is", null);
  if (hasCoords === "0") query = query.is("lat", null);
  if (featured === "1") query = query.eq("featured", true);
  if (featured === "0") query = query.eq("featured", false);
  if (q) query = query.ilike("title", `%${q}%`);

  const { data, count, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // hasImages filter applied in app code (cross-table check)
  let listings = (data ?? []) as Array<{
    id: string;
    [k: string]: unknown;
  }>;

  if (hasImages === "1" || hasImages === "0") {
    const ids = listings.map((l) => l.id);
    if (ids.length > 0) {
      const { data: imgRows } = await supabaseAdmin
        .from("listing_images")
        .select("listing_id")
        .in("listing_id", ids);
      const withImages = new Set(
        ((imgRows as Array<{ listing_id: string }> | null) ?? []).map(
          (r) => r.listing_id,
        ),
      );
      listings = listings.filter((l) =>
        hasImages === "1" ? withImages.has(l.id) : !withImages.has(l.id),
      );
    }
  }

  return NextResponse.json({
    listings,
    total: count ?? 0,
    page,
    page_size: PAGE_SIZE,
  });
}
