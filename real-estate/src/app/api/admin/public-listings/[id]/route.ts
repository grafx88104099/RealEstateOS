// GET /api/admin/public-listings/[id]
// Listing detail with tenant + agent + counts (inquiries/offers/viewings/views) + audit log.

import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { supabaseAdmin as typedAdmin } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAdmin = typedAdmin as unknown as SupabaseClient<any, any, any>;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await withAuth(req, ["super_admin"]);
  if (isAuthError(auth)) return auth;
  const { id } = await params;

  const { data: listing, error } = await supabaseAdmin
    .from("listings")
    .select(
      `id, title, description, price, rooms, area_sqm, floor, total_floors,
       district, address, lat, lng, property_type, listing_type, status,
       featured, featured_until, featured_position, view_count, last_viewed_at,
       moderation_notes, moderation_reviewed_at, moderation_reviewed_by,
       rejected_reason, created_at, published_at, deleted_at, tenant_id, agent_id,
       tenant:tenants(id, name, slug, requires_listing_review),
       agent:users!agent_id(id, full_name, email)`,
    )
    .eq("id", id)
    .single();

  if (error || !listing) {
    return NextResponse.json(
      { error: error?.message ?? "Зар олдсонгүй" },
      { status: 404 },
    );
  }

  const [imgs, inq, off, viw, evts] = await Promise.all([
    supabaseAdmin
      .from("listing_images")
      .select("id, url, sort_order, is_cover")
      .eq("listing_id", id)
      .order("sort_order", { ascending: true }),
    supabaseAdmin
      .from("inquiries")
      .select("id", { count: "exact", head: true })
      .eq("listing_id", id),
    supabaseAdmin
      .from("offers")
      .select("id", { count: "exact", head: true })
      .eq("listing_id", id),
    supabaseAdmin
      .from("viewings")
      .select("id", { count: "exact", head: true })
      .eq("listing_id", id),
    supabaseAdmin
      .from("listing_events")
      .select(
        `id, event_type, from_status, to_status, payload, created_at,
         actor:users!actor_id(id, full_name, email)`,
      )
      .eq("listing_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return NextResponse.json({
    listing,
    images: imgs.data ?? [],
    counts: {
      inquiries: inq.count ?? 0,
      offers: off.count ?? 0,
      viewings: viw.count ?? 0,
      views: (listing as unknown as { view_count?: number }).view_count ?? 0,
    },
    events: evts.data ?? [],
  });
}
