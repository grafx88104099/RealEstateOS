// GET /api/super/scraper/runs — last 100 scraper runs across all sources.
// Includes counts + token cost rollup.

import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { supabaseAdmin as typedAdmin } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAdmin = typedAdmin as unknown as SupabaseClient<any, any, any>;

export async function GET(req: NextRequest) {
  const auth = await withAuth(req, ["super_admin"]);
  if (isAuthError(auth)) return auth;

  const { data, error } = await supabaseAdmin
    .from("scraper_runs")
    .select(
      `id, status, pages_scraped, listings_found, listings_new, listings_updated,
       errors, started_at, finished_at, token_usage, source_id`,
    )
    .order("started_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ runs: data ?? [] });
}
