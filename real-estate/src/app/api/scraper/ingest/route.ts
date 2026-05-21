// POST /api/scraper/ingest
// Callback endpoint hit by the Render scraper-worker after a scrape job
// finishes. Receives the IDs of newly inserted scraped_listings and runs the
// rest of the pipeline (LLM spam classifier, semantic dedup, image upload to
// Supabase Storage, listings(status='pending_review') INSERT).
//
// Auth: shared bearer token via header `X-Worker-Token` matching env
// `INGEST_CALLBACK_TOKEN`. Worker also signs payload with HMAC for the /run
// endpoint, but ingest is simpler — bearer is sufficient.

import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin as typedAdmin } from "@/lib/supabase/admin";
import { ingestNewScraped, type SourceConfig } from "@/lib/scraper/ingest";
import { safeEqual } from "@/lib/utils/timing-safe";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAdmin = typedAdmin as unknown as SupabaseClient<any, any, any>;

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const expected = process.env.INGEST_CALLBACK_TOKEN ?? "";
  const got = req.headers.get("x-worker-token") ?? "";
  if (!expected || !safeEqual(expected, got)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { run_id?: string; source_id?: string; scraped_ids?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.source_id || !Array.isArray(body.scraped_ids)) {
    return NextResponse.json(
      { error: "source_id, scraped_ids required" },
      { status: 400 },
    );
  }

  const { data: src } = await supabaseAdmin
    .from("scraper_sources")
    .select(
      "id, base_url, target_tenant_id, confidence_threshold, spam_threshold, auto_promote",
    )
    .eq("id", body.source_id)
    .single();

  if (!src) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }

  type S = {
    id: string;
    base_url: string;
    target_tenant_id: string | null;
    confidence_threshold: number | null;
    spam_threshold: number | null;
    auto_promote: boolean;
  };
  const s = src as S;

  const cfg: SourceConfig = {
    id: s.id,
    base_url: s.base_url,
    target_tenant_id: s.target_tenant_id,
    confidence_threshold: s.confidence_threshold ?? 0.8,
    spam_threshold: s.spam_threshold ?? 0.3,
    auto_promote: s.auto_promote,
  };

  const stats = await ingestNewScraped(cfg, body.scraped_ids);

  return NextResponse.json({
    run_id: body.run_id,
    source_id: body.source_id,
    ...stats,
  });
}
