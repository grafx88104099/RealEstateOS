// PATCH /api/admin/tenants/[id]
// Super-admin only: update tenant flags (e.g. requires_listing_review).

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
    requires_listing_review?: boolean;
    is_active?: boolean;
    name?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.requires_listing_review === "boolean") {
    update.requires_listing_review = body.requires_listing_review;
  }
  if (typeof body.is_active === "boolean") {
    update.is_active = body.is_active;
  }
  if (typeof body.name === "string" && body.name.trim()) {
    update.name = body.name.trim();
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Шинэчлэх талбар алга" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("tenants")
    .update(update)
    .eq("id", id)
    .select("id, name, requires_listing_review, is_active")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tenant: data });
}
