// POST /api/scraper/scan — trigger a scan
// GET  /api/scraper/scan — get scan history + site configs

import { NextRequest, NextResponse } from "next/server";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runScan, type ScanResult } from "@/lib/scraper/engine";
import { SITE_CONFIGS, SCAN_MODES, type ScanMode } from "@/lib/scraper/site-configs";

export async function POST(req: NextRequest) {
  const auth = await withAuth(req, ["super_admin", "tenant_admin"]);
  if (isAuthError(auth)) return auth;

  let body: { site: string; mode: ScanMode };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!SITE_CONFIGS[body.site]) {
    return NextResponse.json({
      error: `Тодорхойгүй сайт: ${body.site}`,
      available: Object.keys(SITE_CONFIGS),
    }, { status: 400 });
  }

  if (!SCAN_MODES[body.mode]) {
    return NextResponse.json({
      error: `Тодорхойгүй горим: ${body.mode}`,
      available: Object.keys(SCAN_MODES),
    }, { status: 400 });
  }

  try {
    const result: ScanResult = await runScan(body.site, body.mode, auth.tenantId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const auth = await withAuth(req, ["super_admin", "tenant_admin"]);
  if (isAuthError(auth)) return auth;

  // Always return site configs (no DB dependency)
  const sitesInfo = Object.entries(SITE_CONFIGS).map(([id, cfg]) => ({
    id,
    name: cfg.name,
    baseUrl: cfg.baseUrl,
    categories: cfg.categories.length,
    requiresBrowser: cfg.requiresBrowser,
  }));

  // Try to get runs and stats — gracefully handle missing tables
  let runs: unknown[] = [];
  const stats: Record<string, Record<string, number>> = {};

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabaseAdmin as any)
      .from("scraper_runs")
      .select("*")
      .eq("tenant_id", auth.tenantId)
      .order("started_at", { ascending: false })
      .limit(20);
    runs = data ?? [];
  } catch { /* table may not exist */ }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: statsData } = await (supabaseAdmin as any)
      .from("scraped_listings")
      .select("source_site, status")
      .eq("tenant_id", auth.tenantId);

    for (const row of statsData ?? []) {
      if (!stats[row.source_site]) stats[row.source_site] = {};
      stats[row.source_site][row.status] = (stats[row.source_site][row.status] ?? 0) + 1;
    }
  } catch { /* table may not exist */ }

  return NextResponse.json({
    runs,
    stats,
    sites: sitesInfo,
    scanModes: SCAN_MODES,
  });
}
