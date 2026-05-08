// lib/ai/search.ts
// Similarity search via pgvector RPC
// OpenAI is called ONLY to embed the search query text
// Actual search runs in PostgreSQL via HNSW index

import { SupabaseClient } from "@supabase/supabase-js";
import { generateEmbedding } from "./embedding";

// ─── Types ───────────────────────────────────────────────────────

export interface SearchFilters {
  minPrice?: number;
  maxPrice?: number;
  minRooms?: number;
  maxRooms?: number;
  propertyType?: string;
  district?: string;
}

export interface SearchOptions {
  threshold?: number; // cosine similarity threshold (0-1), default 0.7
  limit?: number;     // max results, default 10
  filters?: SearchFilters;
}

export interface MatchedListing {
  id: string;
  title: string;
  description: string;
  price: number;
  rooms: number;
  property_type: string;
  district: string;
  address: string;
  area_sqm: number;
  floor: number;
  total_floors: number;
  listing_type: string;
  slug: string;
  similarity: number;
}

// ─── Text Search → Embedding → pgvector ─────────────────────────

export async function searchListings(
  query: string,
  tenantId: string,
  supabase: SupabaseClient,
  options: SearchOptions = {}
): Promise<{ results: MatchedListing[]; tokens_used: number }> {
  const {
    threshold = 0.7,
    limit = 10,
    filters = {},
  } = options;

  // Step 1: Convert search query to embedding (only OpenAI call)
  const { embedding, tokens_used } = await generateEmbedding(query);

  // Step 2: Call pgvector similarity search via Supabase RPC
  const { data, error } = await supabase.rpc("match_listings", {
    query_embedding: JSON.stringify(embedding),
    p_tenant_id: tenantId,
    match_threshold: threshold,
    match_count: limit,
    p_min_price: filters.minPrice ?? null,
    p_max_price: filters.maxPrice ?? null,
    p_min_rooms: filters.minRooms ?? null,
    p_max_rooms: filters.maxRooms ?? null,
    p_property_type: filters.propertyType ?? null,
    p_district: filters.district ?? null,
  });

  if (error) {
    throw new Error(`Similarity search failed: ${error.message}`);
  }

  return {
    results: (data as MatchedListing[]) || [],
    tokens_used,
  };
}

// ─── Buyer Preference Matching ───────────────────────────────────
// No OpenAI call - uses pre-stored buyer embedding

export async function matchListingsForBuyer(
  buyerId: string,
  tenantId: string,
  supabase: SupabaseClient,
  options: { threshold?: number; limit?: number } = {}
): Promise<MatchedListing[]> {
  const { threshold = 0.65, limit = 20 } = options;

  const { data, error } = await supabase.rpc("match_listings_for_buyer", {
    p_buyer_id: buyerId,
    p_tenant_id: tenantId,
    match_threshold: threshold,
    match_count: limit,
  });

  if (error) {
    throw new Error(`Buyer matching failed: ${error.message}`);
  }

  return (data as MatchedListing[]) || [];
}

// ─── Reverse Match: Find Buyers for a Listing ────────────────────
// When a new listing is created, find matching buyers for notifications

export async function findMatchingBuyers(
  listingEmbedding: number[],
  tenantId: string,
  supabaseAdmin: SupabaseClient,
  threshold = 0.65,
  limit = 50
): Promise<{ user_id: string; similarity: number }[]> {
  // Direct query since we need admin access for cross-user matching
  const { data, error } = await supabaseAdmin.rpc("match_buyers_for_listing", {
    query_embedding: JSON.stringify(listingEmbedding),
    p_tenant_id: tenantId,
    match_threshold: threshold,
    match_count: limit,
  });

  if (error) {
    // Function might not exist yet, return empty
    console.error("Reverse buyer matching failed:", error.message);
    return [];
  }

  return data || [];
}
