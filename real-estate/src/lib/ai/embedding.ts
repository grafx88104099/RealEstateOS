// lib/ai/embedding.ts
// Core embedding service: OpenAI text-embedding-3-small → pgvector
// Called once when listing is created/updated, NOT during search

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

const OPENAI_API_URL = "https://api.openai.com/v1/embeddings";
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

// ─── Types ───────────────────────────────────────────────────────
interface ListingInput {
  id: string;
  title: string;
  description: string | null;
  district: string | null;
  address: string | null;
  price: number;
  rooms: number | null;
  property_type: string | null;
  area_sqm: number | null;
  floor: number | null;
  total_floors: number | null;
  features: string[] | null;
}

interface BuyerPreferenceInput {
  id: string;
  user_id: string;
  description: string | null;
  min_price: number | null;
  max_price: number | null;
  min_rooms: number | null;
  max_rooms: number | null;
  property_types: string[] | null;
  preferred_districts: string[] | null;
  min_area_sqm: number | null;
  max_area_sqm: number | null;
}

interface EmbeddingResult {
  embedding: number[];
  tokens_used: number;
}

// ─── Text Builders ───────────────────────────────────────────────
// Structured text ensures consistent embedding quality

export function buildListingText(listing: ListingInput): string {
  const parts: string[] = [];

  parts.push(listing.title);

  if (listing.description) {
    parts.push(listing.description);
  }

  // Structured metadata for better semantic matching
  if (listing.property_type) {
    parts.push(`Төрөл: ${listing.property_type}`);
  }
  if (listing.district) {
    parts.push(`Дүүрэг: ${listing.district}`);
  }
  if (listing.address) {
    parts.push(`Хаяг: ${listing.address}`);
  }

  parts.push(`Үнэ: ${formatPrice(listing.price)}₮`);

  if (listing.rooms) {
    parts.push(`${listing.rooms} өрөө`);
  }
  if (listing.area_sqm) {
    parts.push(`${listing.area_sqm} м²`);
  }
  if (listing.floor && listing.total_floors) {
    parts.push(`${listing.floor}/${listing.total_floors} давхар`);
  }
  if (listing.features?.length) {
    parts.push(`Онцлог: ${listing.features.join(", ")}`);
  }

  return parts.join(". ");
}

export function buildBuyerPreferenceText(pref: BuyerPreferenceInput): string {
  const parts: string[] = [];

  if (pref.description) {
    parts.push(pref.description);
  }

  if (pref.property_types?.length) {
    parts.push(`Төрөл: ${pref.property_types.join(", ")}`);
  }
  if (pref.preferred_districts?.length) {
    parts.push(`Дүүрэг: ${pref.preferred_districts.join(", ")}`);
  }
  if (pref.min_price || pref.max_price) {
    const priceRange = [
      pref.min_price ? `${formatPrice(pref.min_price)}₮-с` : "",
      pref.max_price ? `${formatPrice(pref.max_price)}₮ хүртэл` : "",
    ]
      .filter(Boolean)
      .join(" ");
    parts.push(`Үнэ: ${priceRange}`);
  }
  if (pref.min_rooms || pref.max_rooms) {
    const roomRange = [
      pref.min_rooms ? `${pref.min_rooms}-с` : "",
      pref.max_rooms ? `${pref.max_rooms} хүртэл` : "",
    ]
      .filter(Boolean)
      .join(" ");
    parts.push(`${roomRange} өрөө`);
  }
  if (pref.min_area_sqm || pref.max_area_sqm) {
    const areaRange = [
      pref.min_area_sqm ? `${pref.min_area_sqm}м²-с` : "",
      pref.max_area_sqm ? `${pref.max_area_sqm}м² хүртэл` : "",
    ]
      .filter(Boolean)
      .join(" ");
    parts.push(`Талбай: ${areaRange}`);
  }

  return parts.join(". ") || "Бүх зар";
}

// ─── OpenAI Embedding API ────────────────────────────────────────

async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI embedding failed: ${response.status} ${error}`);
  }

  const data = await response.json();

  return {
    embedding: data.data[0].embedding,
    tokens_used: data.usage.total_tokens,
  };
}

// Batch embedding: up to 2048 inputs per request
async function generateEmbeddingsBatch(
  texts: string[]
): Promise<EmbeddingResult[]> {
  if (texts.length === 0) return [];
  if (texts.length === 1) return [await generateEmbedding(texts[0])];

  // OpenAI allows up to 2048 inputs per batch
  const BATCH_SIZE = 2048;
  const results: EmbeddingResult[] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: batch,
        dimensions: EMBEDDING_DIMENSIONS,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI batch embedding failed: ${response.status}`);
    }

    const data = await response.json();

    for (const item of data.data) {
      results.push({
        embedding: item.embedding,
        tokens_used: Math.ceil(data.usage.total_tokens / batch.length),
      });
    }
  }

  return results;
}

// ─── Supabase Storage ────────────────────────────────────────────

export async function embedAndStoreListing(
  listing: ListingInput,
  supabaseAdmin: ReturnType<typeof createClient<Database>>
): Promise<{ tokens_used: number }> {
  const text = buildListingText(listing);
  const { embedding, tokens_used } = await generateEmbedding(text);

  const { error } = await supabaseAdmin
    .from("listings")
    .update({
      embedding: JSON.stringify(embedding),
      embedding_updated_at: new Date().toISOString(),
    })
    .eq("id", listing.id);

  if (error) {
    throw new Error(`Failed to store listing embedding: ${error.message}`);
  }

  return { tokens_used };
}

export async function embedAndStoreBuyerPreference(
  pref: BuyerPreferenceInput,
  supabaseAdmin: ReturnType<typeof createClient<Database>>
): Promise<{ tokens_used: number }> {
  const text = buildBuyerPreferenceText(pref);
  const { embedding, tokens_used } = await generateEmbedding(text);

  const { error } = await supabaseAdmin
    .from("buyer_preferences")
    .update({
      embedding: JSON.stringify(embedding),
      embedding_updated_at: new Date().toISOString(),
    })
    .eq("id", pref.id);

  if (error) {
    throw new Error(`Failed to store buyer preference embedding: ${error.message}`);
  }

  return { tokens_used };
}

// Backfill: generate embeddings for all listings missing them
export async function backfillListingEmbeddings(
  supabaseAdmin: ReturnType<typeof createClient<Database>>,
  tenantId: string,
  batchSize = 100
): Promise<{ processed: number; tokens_used: number }> {
  let processed = 0;
  let totalTokens = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: listings, error } = await supabaseAdmin
      .from("listings")
      .select("id, title, description, district, address, price, rooms, property_type, area_sqm, floor, total_floors, features")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .is("embedding", null)
      .limit(batchSize);

    if (error) throw new Error(`Fetch failed: ${error.message}`);
    if (!listings || listings.length === 0) {
      hasMore = false;
      break;
    }

    const texts = listings.map((l) => buildListingText(l as ListingInput));
    const embeddings = await generateEmbeddingsBatch(texts);

    // Bulk update via individual calls (Supabase doesn't support bulk update)
    for (let i = 0; i < listings.length; i++) {
      const { error: updateError } = await supabaseAdmin
        .from("listings")
        .update({
          embedding: JSON.stringify(embeddings[i].embedding),
          embedding_updated_at: new Date().toISOString(),
        })
        .eq("id", listings[i].id);

      if (updateError) {
        console.error(`Failed to update listing ${listings[i].id}:`, updateError);
        continue;
      }

      totalTokens += embeddings[i].tokens_used;
      processed++;
    }

    if (listings.length < batchSize) {
      hasMore = false;
    }
  }

  return { processed, tokens_used: totalTokens };
}

// ─── Export for search (embedding only, no OpenAI) ───────────────

export { generateEmbedding };

// ─── Helpers ─────────────────────────────────────────────────────

function formatPrice(price: number): string {
  if (price >= 1_000_000_000) {
    return `${(price / 1_000_000_000).toFixed(1)} тэрбум`;
  }
  if (price >= 1_000_000) {
    return `${(price / 1_000_000).toFixed(0)} сая`;
  }
  return price.toLocaleString();
}
