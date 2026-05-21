// POST /api/public/search — auth шаардлагагүй AI хайлт
// Аюулгүй байдал: aiCostGuard-аар IP rate-limit + daily USD cap.
// Энэ нь public endpoint тул abuse-аас хамгаалах хатуу хязгаартай.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateEmbedding } from "@/lib/ai/embedding";
import { aiCostGuard, recordAiSpend } from "@/lib/ai/cost-guard";

export async function POST(req: NextRequest) {
  // Public endpoint — illet хатуу rate limit (1 минутад 5 удаа)
  const gate = await aiCostGuard(req, {
    route: "public-search",
    rateWindowSeconds: 60,
    rateLimitMax: 5,
  });
  if (!gate.ok) return gate.response;

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
  // text-embedding-3-small ~$0.02/1M tokens → token бүр ~0.000002 cents
  recordAiSpend(tokens_used * 0.000002 * 100).catch(() => {});

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
