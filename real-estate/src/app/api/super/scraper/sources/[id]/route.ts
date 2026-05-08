// PATCH /api/super/scraper/sources/[id] — toggle enabled, auto_promote, thresholds, schedule.

import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { supabaseAdmin as typedAdmin } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAdmin = typedAdmin as unknown as SupabaseClient<any, any, any>;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await withAuth(req, ["super_admin"]);
  if (isAuthError(auth)) return auth;
  const { id } = await params;

  let body: {
    enabled?: boolean;
    auto_promote?: boolean;
    cron_schedule?: string;
    confidence_threshold?: number;
    spam_threshold?: number;
    target_tenant_id?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.enabled === "boolean") update.enabled = body.enabled;
  if (typeof body.auto_promote === "boolean") update.auto_promote = body.auto_promote;
  if (typeof body.cron_schedule === "string") update.cron_schedule = body.cron_schedule;
  if (typeof body.confidence_threshold === "number")
    update.confidence_threshold = body.confidence_threshold;
  if (typeof body.spam_threshold === "number") update.spam_threshold = body.spam_threshold;
  if (body.target_tenant_id !== undefined) update.target_tenant_id = body.target_tenant_id;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Шинэчлэх талбар алга" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("scraper_sources")
    .update(update)
    .eq("id", id)
    .select(
      "id, name, enabled, cron_schedule, auto_promote, confidence_threshold, spam_threshold, target_tenant_id",
    )
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ source: data });
}
