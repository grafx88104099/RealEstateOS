// POST /api/scraper/cron
// Vercel Cron entry point for the Listing Discovery agent.
// Auth: Bearer SCRAPER_CRON_SECRET (env).
//
// Phase A flow:
//   1. Find enabled scraper_sources whose schedule is due.
//   2. Insert scraper_jobs(status='queued') for each.
//   3. In-process: drain ONE due job synchronously (60s budget).
//   4. Run scan via runScan(), then ingestNewScraped() promotes pending rows.
//
// External worker (Phase B) will replace step 3 with HMAC POST to a remote URL.

import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin as typedAdmin } from "@/lib/supabase/admin";
import { runScan } from "@/lib/scraper/engine";
import { ingestNewScraped, type SourceConfig } from "@/lib/scraper/ingest";
import { SITE_CONFIGS } from "@/lib/scraper/site-configs";
import { isCapReached, pauseAllSources, DAILY_CAP_USD } from "@/lib/scraper/daily-cap";
import { safeEqual } from "@/lib/utils/timing-safe";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAdmin = typedAdmin as unknown as SupabaseClient<any, any, any>;

export const maxDuration = 60; // Vercel: cap at 60s for hobby plan

export async function POST(req: NextRequest) {
  // 1. Bearer auth (constant-time compare)
  const auth = req.headers.get("authorization") ?? "";
  const secret = process.env.SCRAPER_CRON_SECRET ?? "";
  const expected = `Bearer ${secret}`;
  if (!secret || !safeEqual(expected, auth)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Daily USD cap pre-check
  if (await isCapReached()) {
    await pauseAllSources(`Daily USD cap reached: $${DAILY_CAP_USD}`);
    return NextResponse.json(
      { paused: true, reason: "daily_cap_reached", cap_usd: DAILY_CAP_USD },
      { status: 429 },
    );
  }

  // Optional override mode (for manual ad-hoc trigger)
  const url = new URL(req.url);
  const forceMode = url.searchParams.get("mode") as "quick" | "full" | "deep" | null;

  // 2. Pick enabled sources whose `last_scraped_at` is older than schedule
  const { data: sources, error: sourcesErr } = await supabaseAdmin
    .from("scraper_sources")
    .select(
      "id, base_url, target_tenant_id, confidence_threshold, spam_threshold, auto_promote, cron_schedule, enabled, last_scraped_at, tenant_id, name",
    )
    .eq("enabled", true);

  if (sourcesErr) {
    return NextResponse.json(
      { error: `sources: ${sourcesErr.message}` },
      { status: 500 },
    );
  }

  type SourceRow = {
    id: string;
    base_url: string;
    target_tenant_id: string | null;
    confidence_threshold: number;
    spam_threshold: number;
    auto_promote: boolean;
    cron_schedule: string | null;
    enabled: boolean;
    last_scraped_at: string | null;
    tenant_id: string;
    name: string;
  };
  const list = (sources as SourceRow[] | null) ?? [];

  const due = list.filter((s) => isDue(s.cron_schedule, s.last_scraped_at));
  if (due.length === 0) {
    return NextResponse.json({ jobs_enqueued: 0, message: "no sources due" });
  }

  // 3. Enqueue jobs
  const jobInserts = due.map((s) => ({
    source_id: s.id,
    mode: forceMode ?? parseMode(s.cron_schedule),
    status: "queued",
  }));
  await supabaseAdmin.from("scraper_jobs").insert(jobInserts);

  // 4. Drain — production: forward to Render worker via QStash (or direct);
  //    dev: run in-process so the developer can curl-and-test without infra.
  const target = due[0];

  // External worker mode (Phase B). When SCRAPER_WORKER_URL is set, dispatch
  // jobs to the Render container and return early. The worker writes results
  // back via /api/scraper/ingest.
  const workerUrl = process.env.SCRAPER_WORKER_URL;
  if (workerUrl) {
    const dispatched = await dispatchToWorker(workerUrl, due);
    return NextResponse.json({
      jobs_enqueued: due.length,
      dispatched,
      mode: "external_worker",
    });
  }
  const mode: "quick" | "full" | "deep" = forceMode ?? parseMode(target.cron_schedule);

  // Mark the job as running
  const { data: jobRow } = await supabaseAdmin
    .from("scraper_jobs")
    .select("id")
    .eq("source_id", target.id)
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();
  const jobId = (jobRow as { id: string } | null)?.id;
  if (jobId) {
    await supabaseAdmin
      .from("scraper_jobs")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", jobId);
  }

  // Resolve site key from base_url (matches one of SITE_CONFIGS).
  const siteKey = Object.keys(SITE_CONFIGS).find((k) =>
    target.base_url.includes(SITE_CONFIGS[k].baseUrl.replace(/^https?:\/\//, "")),
  );
  if (!siteKey) {
    if (jobId) {
      await supabaseAdmin
        .from("scraper_jobs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          last_error: `unknown site for base_url=${target.base_url}`,
        })
        .eq("id", jobId);
    }
    return NextResponse.json({ jobs_enqueued: due.length, error: "unknown site" });
  }

  let scanResult, ingestStats;
  try {
    scanResult = await runScan(siteKey, mode, target.tenant_id);
  } catch (err) {
    if (jobId) {
      await supabaseAdmin
        .from("scraper_jobs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          last_error: String(err).slice(0, 240),
        })
        .eq("id", jobId);
    }
    return NextResponse.json(
      { error: String(err), jobs_enqueued: due.length },
      { status: 500 },
    );
  }

  // 5. Promote newly-scraped rows
  const { data: freshRows } = await supabaseAdmin
    .from("scraped_listings")
    .select("id")
    .eq("source_site", siteKey)
    .eq("tenant_id", target.tenant_id)
    .eq("status", "pending_review")
    .is("imported_listing_id", null)
    .gte(
      "last_seen_at",
      new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    );

  const ids = ((freshRows as Array<{ id: string }> | null) ?? []).map((r) => r.id);

  const sourceCfg: SourceConfig = {
    id: target.id,
    base_url: target.base_url,
    target_tenant_id: target.target_tenant_id,
    confidence_threshold: target.confidence_threshold ?? 0.8,
    spam_threshold: target.spam_threshold ?? 0.3,
    auto_promote: target.auto_promote,
  };

  ingestStats = await ingestNewScraped(sourceCfg, ids, scanResult.usage);

  // Persist updated usage on the run row (engine wrote initial; ingest may have added)
  await supabaseAdmin
    .from("scraper_runs")
    .update({ token_usage: scanResult.usage })
    .eq("id", scanResult.runId);

  // 6. Mark job done & update last_scraped_at
  if (jobId) {
    await supabaseAdmin
      .from("scraper_jobs")
      .update({
        status: "succeeded",
        finished_at: new Date().toISOString(),
        run_id: scanResult.runId,
      })
      .eq("id", jobId);
  }
  await supabaseAdmin
    .from("scraper_sources")
    .update({ last_scraped_at: new Date().toISOString() })
    .eq("id", target.id);

  return NextResponse.json({
    jobs_enqueued: due.length,
    drained: 1,
    source: target.name,
    mode,
    run_id: scanResult.runId,
    scan: {
      pages: scanResult.pagesScraped,
      found: scanResult.listingsFound,
      new: scanResult.listingsNew,
    },
    ingest: ingestStats,
  });
}

// Dispatch jobs to the external Render worker. Each source becomes one HTTP
// POST. We sign the body with HMAC so the worker can verify authenticity.
async function dispatchToWorker(
  workerUrl: string,
  sources: Array<{
    id: string;
    tenant_id: string;
    cron_schedule: string | null;
  }>,
): Promise<number> {
  const hmacSecret = process.env.SCRAPER_WORKER_HMAC_SECRET ?? "";
  let dispatched = 0;

  for (const s of sources) {
    // Create a scraper_runs row first so the worker can update it.
    const { data: run } = await supabaseAdmin
      .from("scraper_runs")
      .insert({
        tenant_id: s.tenant_id,
        source_id: s.id,
        status: "running",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (!run) continue;

    const payload = JSON.stringify({
      run_id: (run as { id: string }).id,
      source_id: s.id,
      tenant_id: s.tenant_id,
      mode: parseMode(s.cron_schedule),
    });

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (hmacSecret) {
      const { createHmac } = await import("node:crypto");
      headers["X-Signature"] = createHmac("sha256", hmacSecret)
        .update(payload)
        .digest("hex");
    }

    try {
      // Fire-and-forget: 3s timeout for the dispatch handshake. The worker
      // returns 202 immediately and runs the scrape async, so we don't need
      // to keep the Vercel function alive while it works (Hobby plan caps
      // function execution at 10s; QStash treats anything past that as a
      // retry-worthy timeout).
      const res = await fetch(`${workerUrl.replace(/\/$/, "")}/run`, {
        method: "POST",
        headers,
        body: payload,
        signal: AbortSignal.timeout(3_000),
      });
      if (res.ok || res.status === 202) {
        dispatched++;
        await supabaseAdmin
          .from("scraper_jobs")
          .update({ status: "running", started_at: new Date().toISOString(), run_id: (run as { id: string }).id })
          .eq("source_id", s.id)
          .eq("status", "queued");
      }
    } catch (err) {
      // Treat dispatch timeout as success — the worker likely received the
      // request even if our connection dropped. The job row stays as
      // 'queued' which lets a future retry pick it up if not.
      const msg = String(err);
      if (msg.includes("aborted") || msg.includes("timeout")) {
        dispatched++;
      } else {
        console.error("worker dispatch failed:", err);
      }
    }
  }
  return dispatched;
}

// "quick:60" → 60 minutes; "full:360" → 6h, etc. Default 60.
function isDue(schedule: string | null, lastScrapedAt: string | null): boolean {
  const minutes = parseMinutes(schedule);
  if (!lastScrapedAt) return true;
  const last = new Date(lastScrapedAt).getTime();
  return Date.now() - last >= minutes * 60_000;
}

function parseMinutes(schedule: string | null): number {
  const parts = (schedule ?? "quick:60").split(":");
  const n = parseInt(parts[1] ?? "60", 10);
  return Number.isFinite(n) && n > 0 ? n : 60;
}

function parseMode(schedule: string | null): "quick" | "full" | "deep" {
  const m = (schedule ?? "quick:60").split(":")[0];
  if (m === "full" || m === "deep") return m;
  return "quick";
}
