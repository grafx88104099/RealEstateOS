// POST /api/super/scraper/sources/[id]/test
// One-shot quick scan, returns the result synchronously. Useful for diagnostics.

import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { supabaseAdmin as typedAdmin } from "@/lib/supabase/admin";
import { runScan } from "@/lib/scraper/engine";
import { ingestNewScraped, type SourceConfig } from "@/lib/scraper/ingest";
import { SITE_CONFIGS } from "@/lib/scraper/site-configs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAdmin = typedAdmin as unknown as SupabaseClient<any, any, any>;

export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await withAuth(req, ["super_admin"]);
  if (isAuthError(auth)) return auth;
  const { id } = await params;

  const { data: source } = await supabaseAdmin
    .from("scraper_sources")
    .select(
      "id, base_url, tenant_id, target_tenant_id, confidence_threshold, spam_threshold, auto_promote",
    )
    .eq("id", id)
    .single();

  if (!source) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }
  type S = {
    id: string;
    base_url: string;
    tenant_id: string;
    target_tenant_id: string | null;
    confidence_threshold: number | null;
    spam_threshold: number | null;
    auto_promote: boolean;
  };
  const s = source as S;

  const siteKey = Object.keys(SITE_CONFIGS).find((k) =>
    s.base_url.includes(SITE_CONFIGS[k].baseUrl.replace(/^https?:\/\//, "")),
  );
  if (!siteKey) {
    return NextResponse.json({ error: "Unknown site" }, { status: 400 });
  }

  let scan;
  try {
    scan = await runScan(siteKey, "quick", s.tenant_id);
  } catch (err) {
    return NextResponse.json(
      { error: String(err).slice(0, 200) },
      { status: 500 },
    );
  }

  const { data: freshRows } = await supabaseAdmin
    .from("scraped_listings")
    .select("id")
    .eq("source_site", siteKey)
    .eq("tenant_id", s.tenant_id)
    .eq("status", "pending_review")
    .is("imported_listing_id", null)
    .gte(
      "last_seen_at",
      new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    );

  const ids = ((freshRows as Array<{ id: string }> | null) ?? []).map((r) => r.id);

  const ingestStats = await ingestNewScraped(
    {
      id: s.id,
      base_url: s.base_url,
      target_tenant_id: s.target_tenant_id,
      confidence_threshold: s.confidence_threshold ?? 0.8,
      spam_threshold: s.spam_threshold ?? 0.3,
      auto_promote: s.auto_promote,
    },
    ids,
    scan.usage,
  );

  await supabaseAdmin
    .from("scraper_runs")
    .update({ token_usage: scan.usage })
    .eq("id", scan.runId);
  await supabaseAdmin
    .from("scraper_sources")
    .update({ last_scraped_at: new Date().toISOString() })
    .eq("id", s.id);

  return NextResponse.json({ scan, ingest: ingestStats });
}
