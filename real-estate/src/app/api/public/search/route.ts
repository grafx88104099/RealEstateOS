// POST /api/public/search — auth шаардлагагүй AI хайлт
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateEmbedding } from "@/lib/ai/embedding";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { query, district, listing_type, property_type, max_price, min_rooms } = body;

  if (!query || typeof query !== "string" || !query.trim()) {
    return NextResponse.json({ error: "query шаардлагатай" }, { status: 400 });
  }
  if (query.length > 500) {
    return NextResponse.json({ error: "Query хэт урт байна" }, { status: 400 });
  }

  const { embedding, tokens_used } = await generateEmbedding(query.trim());

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin.rpc as any)("match_listings_public", {
    query_embedding: JSON.stringify(embedding),
    match_threshold: 0.2,
    match_count: 20,
    p_min_price: null,
    p_max_price: max_price ? Number(max_price) : null,
    p_min_rooms: min_rooms ? Number(min_rooms) : null,
    p_property_type: property_type ? String(property_type) : null,
    p_district: district ? String(district) : null,
    p_listing_type: listing_type ? String(listing_type) : null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    listings: data ?? [],
    meta: { query: query.trim(), count: (data ?? []).length, tokens_used },
  });
}
