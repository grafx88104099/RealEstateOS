// GET/POST /api/buyer/preferences — upsert consumer preferences + generate embedding
// Route name kept as /api/buyer/preferences for backwards compatibility

import { NextRequest, NextResponse } from "next/server";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { embedAndStoreBuyerPreference } from "@/lib/ai/embedding";

export async function GET(req: NextRequest) {
  const auth = await withAuth(req, ["consumer"]);
  if (isAuthError(auth)) return auth;

  const { data, error } = await supabaseAdmin
    .from("buyer_preferences")
    .select("*")
    .eq("user_id", auth.userId)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ preferences: data ?? null });
}

export async function POST(req: NextRequest) {
  const auth = await withAuth(req, ["consumer"]);
  if (isAuthError(auth)) return auth;

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const fields = {
    user_id: auth.userId,
    tenant_id: auth.tenantId,
    description: body.description as string | null ?? null,
    min_price: body.min_price as number | null ?? null,
    max_price: body.max_price as number | null ?? null,
    min_rooms: body.min_rooms as number | null ?? null,
    max_rooms: body.max_rooms as number | null ?? null,
    min_area_sqm: body.min_area_sqm as number | null ?? null,
    max_area_sqm: body.max_area_sqm as number | null ?? null,
    property_types: body.property_types as string[] | null ?? null,
    preferred_districts: body.preferred_districts as string[] | null ?? null,
  };

  const { data, error } = await supabaseAdmin
    .from("buyer_preferences")
    .upsert(fields as never, { onConflict: "user_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  embedAndStoreBuyerPreference(data as Parameters<typeof embedAndStoreBuyerPreference>[0], supabaseAdmin).catch(
    (err) => console.error("Preference embedding failed:", err)
  );

  return NextResponse.json({ preferences: data }, { status: 200 });
}
