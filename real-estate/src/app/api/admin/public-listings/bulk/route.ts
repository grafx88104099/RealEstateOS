// POST /api/admin/public-listings/bulk
// Body: { ids: string[], action: 'approve' | 'reject' | 'delete' | 'restore' | 'archive', payload?: { rejected_reason?, notes? } }

import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { supabaseAdmin as typedAdmin } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAdmin = typedAdmin as unknown as SupabaseClient<any, any, any>;

type Action = "approve" | "reject" | "delete" | "restore" | "archive";

export async function POST(req: NextRequest) {
  const auth = await withAuth(req, ["super_admin"]);
  if (isAuthError(auth)) return auth;

  let body: {
    ids?: string[];
    action?: Action;
    payload?: { rejected_reason?: string; notes?: string };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ids = body.ids?.filter((s) => typeof s === "string") ?? [];
  const action = body.action;
  if (!ids.length || !action) {
    return NextResponse.json(
      { error: "ids ба action шаардлагатай" },
      { status: 400 },
    );
  }
  if (ids.length > 200) {
    return NextResponse.json({ error: "Дээд тал нь 200 row" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const update: Record<string, unknown> = {
    moderation_reviewed_by: auth.userId,
    moderation_reviewed_at: now,
  };
  let toStatus: string | null = null;
  let eventType = "status_change";

  switch (action) {
    case "approve":
      update.status = "active";
      update.published_at = now;
      update.rejected_reason = null;
      toStatus = "active";
      break;
    case "reject":
      update.status = "rejected";
      update.rejected_reason = body.payload?.rejected_reason ?? null;
      toStatus = "rejected";
      break;
    case "archive":
      update.status = "archived";
      toStatus = "archived";
      break;
    case "delete":
      update.deleted_at = now;
      update.status = "archived";
      toStatus = "archived";
      eventType = "delete";
      break;
    case "restore":
      update.deleted_at = null;
      eventType = "restore";
      break;
    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  if (typeof body.payload?.notes === "string") {
    update.moderation_notes = body.payload.notes;
  }

  const { data: existingRows } = await supabaseAdmin
    .from("listings")
    .select("id, status")
    .in("id", ids);
  const fromMap = new Map<string, string>(
    ((existingRows as Array<{ id: string; status: string }> | null) ?? []).map(
      (r) => [r.id, r.status],
    ),
  );

  const { data, error } = await supabaseAdmin
    .from("listings")
    .update(update)
    .in("id", ids)
    .select("id, status, deleted_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Best-effort audit (one row per listing)
  const eventRows = ids.map((id) => ({
    listing_id: id,
    actor_id: auth.userId,
    event_type: eventType,
    from_status: fromMap.get(id) ?? null,
    to_status: toStatus,
    payload: body.payload ?? {},
  }));
  await supabaseAdmin.from("listing_events").insert(eventRows);

  return NextResponse.json({
    updated: data?.length ?? 0,
    listings: data ?? [],
  });
}
