import { createSupabaseServer } from "@/lib/supabase/server";
import { decodeJWT, ROLE_HOME, AllowedRole } from "@/lib/utils/jwt";
import { supabaseAdmin } from "@/lib/supabase/admin";
import HomeClient from "@/components/home/home-client";

export default async function HomePage() {
  // Auth check
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();

  let dashboardHref = "/consumer";
  let dashboardLabel = "Миний самбар";
  if (session) {
    const payload = decodeJWT(session.access_token);
    const role = payload.user_role as AllowedRole | undefined;
    dashboardHref = (role && ROLE_HOME[role]) ? ROLE_HOME[role] : "/consumer";
    dashboardLabel = role === "consumer" ? "Миний самбар" : "Хяналтын самбар";
  }

  // Initial listings (server-side)
  const { data: listings } = await supabaseAdmin
    .from("listings")
    .select("id, title, price, rooms, area_sqm, floor, total_floors, property_type, listing_type, district, address")
    .eq("status", "active")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(60);

  const ids = (listings ?? []).map((l) => (l as { id: string }).id);
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
  const enriched = (listings ?? []).map((l) => ({
    ...(l as object),
    cover_image_url: coverByListing.get((l as { id: string }).id) ?? null,
  }));

  return (
    <HomeClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialListings={enriched as any}
      isLoggedIn={!!session}
      dashboardHref={dashboardHref}
      dashboardLabel={dashboardLabel}
    />
  );
}
