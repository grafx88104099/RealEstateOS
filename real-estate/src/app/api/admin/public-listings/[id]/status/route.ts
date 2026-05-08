// PATCH /api/admin/public-listings/[id]/status
// Generic status setter — also handles approve/reject/restore/soft-delete via shorthand.
// Body: { status, notes?, rejected_reason? }
//   status: 'active' | 'pending_review' | 'rejected' | 'archived' | 'sold' | 'rented' | 'expired'
//   special: send { soft_delete: true } to soft-delete; { restore: true } to undelete.

import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { supabaseAdmin as typedAdmin } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAdmin = typedAdmin as unknown as SupabaseClient<any, any, any>;

const ALLOWED = [
  "draft",
  "pending_review",
  "active",
  "sold",
  "rented",
  "expired",
  "archived",
  "rejected",
] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await withAuth(req, ["super_admin"]);
  if (isAuthError(auth)) return auth;
  const { id } = await params;

  let body: {
    status?: string;
    notes?: string;
    rejected_reason?: string;
    soft_delete?: boolean;
    restore?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Read current state for audit + validation
  const { data: existing, error: fErr } = await supabaseAdmin
    .from("listings")
    .select("id, status, deleted_at")
    .eq("id", id)
    .single();
  if (fErr || !existing) {
    return NextResponse.json({ error: "Зар олдсонгүй" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const update: Record<string, unknown> = {
    moderation_reviewed_by: auth.userId,
    moderation_reviewed_at: now,
  };

  let eventType = "status_change";
  let toStatus = existing.status as string;

  if (body.soft_delete) {
    update.deleted_at = now;
    update.status = "archived";
    eventType = "delete";
    toStatus = "archived";
  } else if (body.restore) {
    update.deleted_at = null;
    eventType = "restore";
  } else if (body.status) {
    if (!ALLOWED.includes(body.status as (typeof ALLOWED)[number])) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    update.status = body.status;
    toStatus = body.status;
    if (body.status === "active") {
      update.published_at = update.published_at ?? now;
      update.rejected_reason = null;
    }
    if (body.status === "rejected") {
      update.rejected_reason = body.rejected_reason ?? null;
    }
  } else {
    return NextResponse.json({ error: "status шаардлагатай" }, { status: 400 });
  }

  if (typeof body.notes === "string") {
    update.moderation_notes = body.notes;
  }

  const { data: updated, error: uErr } = await supabaseAdmin
    .from("listings")
    .update(update)
    .eq("id", id)
    .select(
      "id, status, deleted_at, moderation_notes, rejected_reason, moderation_reviewed_at",
    )
    .single();
  if (uErr) {
    return NextResponse.json({ error: uErr.message }, { status: 500 });
  }

  // Audit row (best-effort)
  await supabaseAdmin.from("listing_events").insert({
    listing_id: id,
    actor_id: auth.userId,
    event_type: eventType,
    from_status: existing.status,
    to_status: toStatus,
    payload: {
      notes: body.notes,
      rejected_reason: body.rejected_reason,
      soft_delete: !!body.soft_delete,
      restore: !!body.restore,
    },
  });

  return NextResponse.json({ listing: updated });
}
