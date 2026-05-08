// lib/scraper/engine.ts
// Core scraper engine — runs scans against configured sites
// Handles pagination, rate limiting, dedup, and AI parsing

import { supabaseAdmin } from "@/lib/supabase/admin";
import { parseUneguiDetailHTML, extractListingLinks, extractFieldsFromText } from "./unegui";
import { parseListingWithAI } from "./ai-parser";
import { fetchWithBrowser } from "./browser";
import { isAllowed } from "./robots";
import { emptyUsage, addParser, type TokenUsage } from "./cost";
import { SITE_CONFIGS, SCAN_MODES, randomDelay, buildPageUrl, type ScanMode, type SiteConfig } from "./site-configs";

export interface ScanResult {
  runId: string;
  site: string;
  mode: ScanMode;
  pagesScraped: number;
  listingsFound: number;
  listingsNew: number;
  listingsUpdated: number;
  errors: string[];
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  usage: TokenUsage;
}

// ─── Main scan function ─────────────────────────────────────
export async function runScan(
  siteId: string,
  mode: ScanMode,
  tenantId: string,
): Promise<ScanResult> {
  const config = SITE_CONFIGS[siteId];
  if (!config) throw new Error(`Unknown site: ${siteId}`);

  const scanConfig = SCAN_MODES[mode];
  const startedAt = new Date().toISOString();
  const startMs = Date.now();
  const errors: string[] = [];
  let pagesScraped = 0;
  let listingsFound = 0;
  let listingsNew = 0;
  let listingsUpdated = 0;
  const usage: TokenUsage = emptyUsage();

  // Create run log
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: run } = await (supabaseAdmin as any)
    .from("scraper_runs")
    .insert({
      tenant_id: tenantId,
      source_id: null,
      status: "running",
      started_at: startedAt,
    })
    .select("id")
    .single();

  const runId = run?.id ?? "unknown";

  try {
    // Get already-known listing IDs to detect new vs existing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingData } = await (supabaseAdmin as any)
      .from("scraped_listings")
      .select("source_ext_id, price, last_seen_at")
      .eq("source_site", siteId)
      .eq("tenant_id", tenantId);

    const existingMap = new Map<string, { price: number | null; last_seen_at: string }>();
    for (const e of existingData ?? []) {
      if (e.source_ext_id) {
        existingMap.set(e.source_ext_id, { price: e.price, last_seen_at: e.last_seen_at });
      }
    }

    // Scan each category
    for (const category of config.categories) {
      const maxPages = Math.min(scanConfig.pagesPerCategory, config.pagination.maxPages);

      for (let page = config.pagination.startPage; page < config.pagination.startPage + maxPages; page++) {
        const pageUrl = buildPageUrl(config, category.path, page);

        try {
          // Fetch page (simple fetch — may fail on Cloudflare)
          const html = await fetchPage(pageUrl, config);
          if (!html) {
            errors.push(`Failed to fetch: ${pageUrl}`);
            break; // Stop pagination for this category
          }

          pagesScraped++;

          // Extract listing links
          const links = extractListingLinks(html);
          if (links.length === 0) break; // No more listings

          listingsFound += links.length;

          // Process each listing
          for (const link of links) {
            try {
              const isExisting = existingMap.has(link.extId);

              // Quick mode: skip existing
              if (mode === "quick" && isExisting) continue;

              // Fetch detail page
              await randomDelay(config);
              const detailHtml = await fetchPage(link.url, config);
              if (!detailHtml) continue;

              // Parse
              const raw = parseUneguiDetailHTML(detailHtml, link.url);
              if (!raw) continue;

              // AI parse (only for new listings to save cost)
              let aiParsed = null;
              if (!isExisting) {
                const parsed = await parseListingWithAI(raw.raw_text);
                aiParsed = parsed;
                if (parsed?.tokens) {
                  addParser(usage, parsed.tokens.input, parsed.tokens.output);
                }
              }
              const regexFields = extractFieldsFromText(raw.raw_text);

              const merged = {
                title: aiParsed?.title || raw.title,
                description: aiParsed?.description || "",
                price: aiParsed?.price ?? (regexFields.price as number) ?? null,
                rooms: aiParsed?.rooms ?? (regexFields.rooms as number) ?? null,
                area_sqm: aiParsed?.area_sqm ?? (regexFields.area_sqm as number) ?? null,
                floor: aiParsed?.floor ?? (regexFields.floor as number) ?? null,
                total_floors: aiParsed?.total_floors ?? (regexFields.total_floors as number) ?? null,
                district: aiParsed?.district ?? (regexFields.district as string) ?? null,
                address: aiParsed?.address ?? null,
                property_type: aiParsed?.property_type ?? (regexFields.property_type as string) ?? "apartment",
                listing_type: aiParsed?.listing_type ?? category.listingType,
                contact_phone: aiParsed?.contact_phone ?? null,
                confidence: aiParsed?.confidence ?? 0.5,
              };

              if (isExisting) {
                // Update existing — check price change
                const existing = existingMap.get(link.extId)!;
                const priceChanged = scanConfig.checkPriceChanges && merged.price && existing.price && merged.price !== existing.price;

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const updateData: any = { last_seen_at: new Date().toISOString() };
                if (priceChanged) {
                  updateData.price = merged.price;
                }

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (supabaseAdmin as any)
                  .from("scraped_listings")
                  .update(updateData)
                  .eq("source_site", siteId)
                  .eq("source_ext_id", link.extId)
                  .eq("tenant_id", tenantId);

                listingsUpdated++;
              } else {
                // Insert new
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (supabaseAdmin as any)
                  .from("scraped_listings")
                  .upsert({
                    tenant_id: tenantId,
                    source_url: link.url,
                    source_ext_id: link.extId,
                    source_site: siteId,
                    ...merged,
                    images: raw.images,
                    raw_text: raw.raw_text.slice(0, 5000),
                    parsed_data: { ai: aiParsed, regex: regexFields },
                    ai_confidence: merged.confidence,
                    ai_parsed_at: aiParsed ? new Date().toISOString() : null,
                    status: "pending_review",
                    last_seen_at: new Date().toISOString(),
                  }, { onConflict: "source_site,source_ext_id" });

                listingsNew++;
              }
            } catch (err) {
              errors.push(`Listing ${link.extId}: ${String(err).slice(0, 100)}`);
            }
          }
        } catch (err) {
          errors.push(`Page ${pageUrl}: ${String(err).slice(0, 100)}`);
        }

        // Delay between pages
        await randomDelay(config);
      }
    }

    // Deep mode: mark stale listings
    if (scanConfig.markStaleListings) {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabaseAdmin as any)
        .from("scraped_listings")
        .update({ status: "stale" })
        .eq("source_site", siteId)
        .eq("tenant_id", tenantId)
        .eq("status", "pending_review")
        .lt("last_seen_at", threeDaysAgo);
    }
  } catch (err) {
    errors.push(`Fatal: ${String(err).slice(0, 200)}`);
  }

  const finishedAt = new Date().toISOString();
  const durationMs = Date.now() - startMs;

  // Update run log
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabaseAdmin as any)
    .from("scraper_runs")
    .update({
      status: errors.length > 0 && listingsNew === 0 ? "failed" : "completed",
      pages_scraped: pagesScraped,
      listings_found: listingsFound,
      listings_new: listingsNew,
      listings_updated: listingsUpdated,
      errors: errors.slice(0, 20),
      finished_at: finishedAt,
      token_usage: usage,
    })
    .eq("id", runId);

  return {
    runId,
    site: siteId,
    mode,
    pagesScraped,
    listingsFound,
    listingsNew,
    listingsUpdated,
    errors: errors.slice(0, 10),
    startedAt,
    finishedAt,
    durationMs,
    usage,
  };
}

// ─── Fetch with Playwright (Cloudflare bypass) + robots.txt honor ─────────────
async function fetchPage(url: string, config: SiteConfig): Promise<string | null> {
  if (!(await isAllowed(url))) {
    return null;
  }
  if (config.requiresBrowser) {
    return fetchWithBrowser(url, config.cloudflareWaitMs);
  }

  // Simple fetch for non-Cloudflare sites
  try {
    const res = await fetch(url, {
      headers: config.headers,
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    if (html.includes("Just a moment") || html.includes("cf_chl")) {
      // Fallback to browser
      return fetchWithBrowser(url, 8000);
    }
    return html;
  } catch {
    return null;
  }
}
