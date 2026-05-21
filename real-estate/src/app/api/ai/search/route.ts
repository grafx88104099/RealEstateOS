// app/api/ai/search/route.ts
// POST /api/ai/search
// Text query → OpenAI embedding → pgvector similarity search
// Tenant-isolated via JWT

import { NextRequest, NextResponse } from "next/server";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { aiCostGuard } from "@/lib/ai/cost-guard";
import { createSupabaseServer } from "@/lib/supabase/server";
import { searchListings, SearchFilters } from "@/lib/ai/search";
import { Redis } from "@upstash/redis";

// Rate limiting via Upstash Redis
const redis = Redis.fromEnv();

const RATE_LIMIT = {
  window: 60, // seconds
  max: 20,    // requests per window
};

interface SearchRequestBody {
  query: string;
  filters?: SearchFilters;
  threshold?: number;
  limit?: number;
}

export async function POST(req: NextRequest) {
  // 1. Auth check - all authenticated roles can search
  const auth = await withAuth(req, [
    "super_admin",
    "tenant_admin",
    "agent",
    "consumer",
  ]);
  if (isAuthError(auth)) return auth;

  const gate = await aiCostGuard(req, { route: "search", identifier: auth.userId });
  if (!gate.ok) return gate.response;

  // 2. Rate limiting
  const rateLimitKey = `ai:search:${auth.userId}`;
  const current = await redis.incr(rateLimitKey);
  if (current === 1) {
    await redis.expire(rateLimitKey, RATE_LIMIT.window);
  }
  if (current > RATE_LIMIT.max) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 }
    );
  }

  // 3. Parse and validate request
  let body: SearchRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { query, filters, threshold, limit } = body;

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return NextResponse.json(
      { error: "Query is required" },
      { status: 400 }
    );
  }

  if (query.length > 500) {
    return NextResponse.json(
      { error: "Query too long (max 500 chars)" },
      { status: 400 }
    );
  }

  // 4. Execute search
  try {
    const supabase = await createSupabaseServer();

    const { results, tokens_used } = await searchListings(
      query.trim(),
      auth.tenantId,
      supabase,
      {
        threshold: threshold ?? 0.7,
        limit: Math.min(limit ?? 10, 50), // Cap at 50
        filters,
      }
    );

    return NextResponse.json({
      results,
      meta: {
        query: query.trim(),
        count: results.length,
        threshold: threshold ?? 0.7,
        tokens_used,
      },
    });
  } catch (error) {
    console.error("AI search error:", error);
    return NextResponse.json(
      { error: "Search failed. Please try again." },
      { status: 500 }
    );
  }
}
