// PATCH /api/offers/:id — update offer status (accept/reject/counter/withdraw)

import { NextRequest, NextResponse } from "next/server";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { supabaseAdminLoose as supabaseAdmin } from "@/lib/supabase/admin-loose";

const ALLOWED_STATUSES = [
  "draft",
  "pending_seller_ai",
  "pending_seller_review",
  "countered",
  "accepted",
  "rejected",
  "withdrawn",
  "expired",
] as const;

type OfferStatus = (typeof ALLOWED_STATUSES)[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await withAuth(req, ["consumer", "agent", "tenant_admin"]);
  if (isAuthError(auth)) return auth;

  const { id } = await params;

  let body: {
    status?: OfferStatus;
    counter_amount?: number;
    message?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.status && !ALLOWED_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { data: existing, error: fErr } = await supabaseAdmin
    .from("offers")
    .select("id, buyer_id, seller_id, listing_id, amount, tenant_id")
    .eq("id", id)
    .single();
  if (fErr || !existing) {
    return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  }

  const isBuyer = existing.buyer_id === auth.userId;
  const isSeller = existing.seller_id === auth.userId;
  if (!isBuyer && !isSeller && auth.role !== "tenant_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Counter-offer creates a child offer; current one becomes 'countered'
  if (body.status === "countered" && body.counter_amount) {
    await supabaseAdmin
      .from("offers")
      .update({ status: "countered", updated_at: new Date().toISOString() })
      .eq("id", id);

    const { data: child, error: cErr } = await supabaseAdmin
      .from("offers")
      .insert({
        listing_id: existing.listing_id,
        buyer_id: existing.buyer_id,
        seller_id: existing.seller_id,
        tenant_id: existing.tenant_id,
        amount: body.counter_amount,
        message: body.message ?? null,
        status: isSeller ? "pending_seller_review" : "pending_seller_ai",
        created_by: "human",
        parent_offer_id: id,
      })
      .select("id, amount, status, parent_offer_id")
      .single();

    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
    return NextResponse.json({ offer: child });
  }

  const { data, error } = await supabaseAdmin
    .from("offers")
    .update({
      status: body.status,
      message: body.message ?? undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, status, amount, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ offer: data });
}
