// GET  /api/offers — list offers visible to current user (buyer or seller side)
// POST /api/offers — create a new offer (buyer side)

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
  const { searchParams } = new URL(req.url);
  const role = searchParams.get("as") ?? "auto"; // 'buyer' | 'seller' | 'auto'

  let query = supabase
    .from("offers")
    .select(`
      id, amount, status, message, created_by, ai_reasoning, parent_offer_id,
      created_at, updated_at, expires_at,
      listing:listings(id, title, price, district, rooms),
      buyer:users!buyer_id(id, full_name, email)
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  if (role === "buyer" || (role === "auto" && auth.role === "consumer")) {
    query = query.eq("buyer_id", auth.userId);
  } else if (role === "seller" || auth.role === "agent") {
    query = query.eq("seller_id", auth.userId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ offers: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await withAuth(req, ["consumer", "agent", "tenant_admin"]);
  if (isAuthError(auth)) return auth;

  let body: {
    listing_id?: string;
    amount?: number;
    message?: string;
    terms?: Record<string, unknown>;
    created_by?: "human" | "ai";
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.listing_id || !body.amount) {
    return NextResponse.json(
      { error: "listing_id, amount шаардлагатай" },
      { status: 400 }
    );
  }

  const { data: listing, error: lErr } = await supabaseAdmin
    .from("listings")
    .select("id, agent_id, tenant_id, price")
    .eq("id", body.listing_id)
    .single();
  if (lErr || !listing) {
    return NextResponse.json({ error: "Зар олдсонгүй" }, { status: 404 });
  }

  const { data: offer, error } = await supabaseAdmin
    .from("offers")
    .insert({
      listing_id: body.listing_id,
      buyer_id: auth.userId,
      seller_id: listing.agent_id,
      tenant_id: listing.tenant_id,
      amount: body.amount,
      message: body.message ?? null,
      terms: body.terms ?? {},
      status: "pending_seller_ai",
      created_by: body.created_by ?? "human",
    })
    .select(`
      id, amount, status, created_at,
      listing:listings(id, title, price)
    `)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ offer }, { status: 201 });
}
