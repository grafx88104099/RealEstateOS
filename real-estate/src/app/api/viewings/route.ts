// GET  /api/viewings — list viewings for current user
// POST /api/viewings — buyer proposes viewing slots for a listing

import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseAdminLoose as supabaseAdmin } from "@/lib/supabase/admin-loose";

export async function GET(req: NextRequest) {
  const auth = await withAuth(req, ["consumer", "agent", "tenant_admin", "super_admin"]);
  if (isAuthError(auth)) return auth;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createSupabaseServer()) as unknown as SupabaseClient<any, any, any>;
  let query = supabase
    .from("viewings")
    .select(`
      id, proposed_slots, confirmed_at, status, notes, created_by, created_at,
      listing:listings(id, title, district),
      buyer:users!buyer_id(id, full_name)
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  if (auth.role === "consumer") {
    query = query.eq("buyer_id", auth.userId);
  } else if (auth.role === "agent") {
    query = query.eq("seller_id", auth.userId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ viewings: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await withAuth(req, ["consumer", "agent", "tenant_admin"]);
  if (isAuthError(auth)) return auth;

  let body: {
    listing_id?: string;
    proposed_slots?: string[];
    notes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.listing_id || !body.proposed_slots?.length) {
    return NextResponse.json(
      { error: "listing_id, proposed_slots шаардлагатай" },
      { status: 400 }
    );
  }

  const { data: listing } = await supabaseAdmin
    .from("listings")
    .select("agent_id, tenant_id")
    .eq("id", body.listing_id)
    .single();

  const { data, error } = await supabaseAdmin
    .from("viewings")
    .insert({
      listing_id: body.listing_id,
      buyer_id: auth.userId,
      seller_id: listing?.agent_id,
      tenant_id: listing?.tenant_id ?? auth.tenantId,
      proposed_slots: body.proposed_slots,
      notes: body.notes ?? null,
      status: "proposed",
      created_by: "human",
    })
    .select("id, status, proposed_slots, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ viewing: data }, { status: 201 });
}
