// GET /api/super/scraper/sources — all sources for super admin.

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
    .from("scraper_sources")
    .select(
      `id, name, base_url, enabled, cron_schedule, auto_promote,
       confidence_threshold, spam_threshold, target_tenant_id,
       last_scraped_at, total_scraped, tenant_id, created_at,
       tenant:tenants(id, name)`,
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sources: data ?? [] });
}
