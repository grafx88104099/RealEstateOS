// POST /api/listings — create listing + auto-embed
// GET  /api/listings — list tenant's listings

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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

  let raw: Record<string, unknown>;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validation — zod schema, бүх талбарт хязгаар
  const schema = z.object({
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().max(10000).optional().nullable(),
    price: z.coerce.number().positive().max(1e12),
    rooms: z.coerce.number().int().min(0).max(50).optional().nullable(),
    area_sqm: z.coerce.number().positive().max(100000).optional().nullable(),
    floor: z.coerce.number().int().min(-5).max(200).optional().nullable(),
    total_floors: z.coerce.number().int().min(1).max(200).optional().nullable(),
    property_type: z.enum(["apartment", "house", "land", "commercial", "office"]).optional(),
    listing_type: z.enum(["sale", "rent"]).optional(),
    district: z.string().trim().max(100).optional().nullable(),
    khoroo: z.string().trim().max(100).optional().nullable(),
    address: z.string().trim().max(500).optional().nullable(),
    features: z.array(z.string().max(100)).max(50).optional(),
  });

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Буруу талбар", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const v = parsed.data;
  if (v.floor != null && v.total_floors != null && v.floor > v.total_floors) {
    return NextResponse.json({ error: "Давхар нь нийт давхараас их байж болохгүй" }, { status: 400 });
  }

  const slug = `${v.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}-${Date.now()}`;

  // tenants.requires_listing_review шалгах — true бол status='pending_review'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tenantCfg } = await (supabaseAdmin as any)
    .from("tenants")
    .select("requires_listing_review")
    .eq("id", auth.tenantId)
    .maybeSingle();
  const requiresReview = !!tenantCfg?.requires_listing_review;
  const initialStatus = requiresReview ? "pending_review" : "active";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insertPayload: any = {
    tenant_id: auth.tenantId,
    agent_id: auth.userId,
    title: v.title,
    slug,
    description: v.description ?? null,
    price: v.price,
    rooms: v.rooms ?? null,
    area_sqm: v.area_sqm ?? null,
    floor: v.floor ?? null,
    total_floors: v.total_floors ?? null,
    property_type: v.property_type ?? "apartment",
    listing_type: v.listing_type ?? "sale",
    district: v.district ?? null,
    khoroo: v.khoroo ?? null,
    address: v.address ?? null,
    features: v.features ?? [],
    status: initialStatus,
    published_at: requiresReview ? null : new Date().toISOString(),
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
