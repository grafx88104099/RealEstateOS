// lib/scraper/dedup.ts
// Cross-source semantic dedup against active listings using pgvector.
// Returns the matching listing id when cosine similarity >= threshold AND
// district/price match. Caller should set scraped_listings.dedup_match_listing_id.

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin as typedAdmin } from "@/lib/supabase/admin";
import { generateEmbedding } from "@/lib/ai/embedding";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAdmin = typedAdmin as unknown as SupabaseClient<any, any, any>;

const DEFAULT_THRESHOLD = 0.92;
const PRICE_BAND_PCT = 0.05;
const RECENT_DAYS = 60;

export interface DedupInput {
  title: string;
  district: string | null;
  price: number | null;
  tenantId: string;
}

export interface DedupResult {
  matched_listing_id: string | null;
  similarity: number | null;
  embedding_tokens: number;
}

export async function checkDedup(input: DedupInput): Promise<DedupResult> {
  if (!input.district || input.price == null) {
    return { matched_listing_id: null, similarity: null, embedding_tokens: 0 };
  }

  const text = `${input.title} ${input.district} ${input.price}`;
  let embedding: number[];
  let tokens = 0;
  try {
    const r = await generateEmbedding(text);
    embedding = r.embedding;
    tokens = r.tokens_used;
  } catch {
    return { matched_listing_id: null, similarity: null, embedding_tokens: 0 };
  }

  const minP = Math.floor(input.price * (1 - PRICE_BAND_PCT));
  const maxP = Math.ceil(input.price * (1 + PRICE_BAND_PCT));
  const since = new Date(Date.now() - RECENT_DAYS * 24 * 3600 * 1000).toISOString();

  // Use match_listings RPC (existing) with a high threshold.
  const { data } = await supabaseAdmin.rpc("match_listings", {
    query_embedding: JSON.stringify(embedding),
    p_tenant_id: input.tenantId,
    match_threshold: DEFAULT_THRESHOLD,
    match_count: 5,
    p_min_price: minP,
    p_max_price: maxP,
    p_min_rooms: null,
    p_max_rooms: null,
    p_property_type: null,
    p_district: input.district,
  });

  type Row = { id: string; similarity: number; created_at?: string };
  const rows = (data as Row[] | null) ?? [];
  // Filter by recency client-side since match_listings RPC may not support it.
  const recent = rows.filter((r) => !r.created_at || r.created_at >= since);
  if (recent.length === 0) {
    return { matched_listing_id: null, similarity: null, embedding_tokens: tokens };
  }

  return {
    matched_listing_id: recent[0].id,
    similarity: recent[0].similarity,
    embedding_tokens: tokens,
  };
}
