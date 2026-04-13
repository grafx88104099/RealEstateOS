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

  return (
    <HomeClient
      initialListings={listings ?? []}
      isLoggedIn={!!session}
      dashboardHref={dashboardHref}
      dashboardLabel={dashboardLabel}
    />
  );
}
