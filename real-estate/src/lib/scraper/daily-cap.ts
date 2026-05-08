// lib/scraper/daily-cap.ts
// Tracks per-day USD spend across scraper runs and pauses sources when cap hit.

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin as typedAdmin } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAdmin = typedAdmin as unknown as SupabaseClient<any, any, any>;

const CAP_USD = parseFloat(process.env.SCRAPER_DAILY_USD_CAP ?? "5");

export async function getTodaySpendCents(): Promise<number> {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);

  const { data } = await supabaseAdmin
    .from("scraper_runs")
    .select("token_usage")
    .gte("started_at", since.toISOString());

  type Row = { token_usage: { total_usd_cents?: number } | null };
  const rows = (data as Row[] | null) ?? [];
  return rows.reduce((acc, r) => acc + (r.token_usage?.total_usd_cents ?? 0), 0);
}

export async function isCapReached(): Promise<boolean> {
  const cents = await getTodaySpendCents();
  return cents / 100 >= CAP_USD;
}

export async function pauseAllSources(reason: string): Promise<void> {
  await supabaseAdmin
    .from("scraper_sources")
    .update({ enabled: false })
    .eq("enabled", true);
  console.warn(`[scraper] All sources paused: ${reason}`);
}

export const DAILY_CAP_USD = CAP_USD;
