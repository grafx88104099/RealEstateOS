// PATCH  /api/scraper/[id] — approve/reject/import scraped listing
// DELETE /api/scraper/[id] — delete scraped listing

import { NextRequest, NextResponse } from "next/server";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { embedAndStoreListing } from "@/lib/ai/embedding";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const auth = await withAuth(req, ["super_admin", "tenant_admin"]);
  if (isAuthError(auth)) return auth;

  let body: { action: string; edits?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Fetch scraped listing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: scraped, error: fetchErr } = await (supabaseAdmin as any)
    .from("scraped_listings")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", auth.tenantId)
    .single();

  if (fetchErr || !scraped) {
    return NextResponse.json({ error: "Олдсонгүй" }, { status: 404 });
  }

  // REJECT
  if (body.action === "reject") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any)
      .from("scraped_listings")
      .update({
        status: "rejected",
        reviewed_by: auth.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json({ success: true, status: "rejected" });
  }

  // APPROVE & IMPORT
  if (body.action === "approve") {
    const edits = body.edits ?? {};
    const title = (edits.title as string) || scraped.title || "Imported listing";
    const slug = `${title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}-${Date.now()}`;

    // Create listing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: listing, error: insertErr } = await (supabaseAdmin as any)
      .from("listings")
      .insert({
        tenant_id: auth.tenantId,
        agent_id: auth.userId,
        title,
        slug,
        description: (edits.description as string) || scraped.description || "",
        price: Number(edits.price ?? scraped.price ?? 0),
        rooms: edits.rooms ?? scraped.rooms ?? null,
        area_sqm: edits.area_sqm ?? scraped.area_sqm ?? null,
        floor: edits.floor ?? scraped.floor ?? null,
        total_floors: edits.total_floors ?? scraped.total_floors ?? null,
        property_type: (edits.property_type as string) || scraped.property_type || "apartment",
        listing_type: (edits.listing_type as string) || scraped.listing_type || "sale",
        district: (edits.district as string) || scraped.district || null,
        address: (edits.address as string) || scraped.address || null,
        features: [],
        status: "active",
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // Import images from scraped listing to listing_images
    const scrapedImages: string[] = Array.isArray(scraped.images) ? scraped.images : [];
    if (scrapedImages.length > 0 && listing) {
      const imageInserts = scrapedImages.map((url: string, idx: number) => ({
        listing_id: listing.id,
        tenant_id: auth.tenantId,
        url,
        thumbnail_url: url,
        sort_order: idx,
        is_cover: idx === 0,
        alt_text: `${title} - ${idx + 1}`,
      }));

      await supabaseAdmin
        .from("listing_images")
        .insert(imageInserts);
    }

    // Update scraped listing status
    await supabaseAdmin
      .from("scraped_listings")
      .update({
        status: "approved",
        imported_listing_id: listing.id,
        reviewed_by: auth.userId,
        reviewed_at: new Date().toISOString(),
      } as never)
      .eq("id", id);

    // Auto-embed the new listing
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
        features: [],
      },
      supabaseAdmin
    ).catch((err) => console.error("Import embed failed:", err));

    return NextResponse.json({ success: true, status: "approved", listing_id: listing.id });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const auth = await withAuth(req, ["super_admin", "tenant_admin"]);
  if (isAuthError(auth)) return auth;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabaseAdmin as any)
    .from("scraped_listings")
    .delete()
    .eq("id", id)
    .eq("tenant_id", auth.tenantId);

  return NextResponse.json({ success: true });
}
