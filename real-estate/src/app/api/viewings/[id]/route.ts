// PATCH /api/viewings/:id — confirm, cancel, or update a viewing

import { NextRequest, NextResponse } from "next/server";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { supabaseAdminLoose as supabaseAdmin } from "@/lib/supabase/admin-loose";

const ALLOWED = ["proposed", "confirmed", "completed", "cancelled", "no_show"] as const;
type Status = (typeof ALLOWED)[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await withAuth(req, ["consumer", "agent", "tenant_admin"]);
  if (isAuthError(auth)) return auth;
  const { id } = await params;

  let body: { status?: Status; confirmed_at?: string; notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.status && !ALLOWED.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("viewings")
    .update({
      status: body.status,
      confirmed_at: body.confirmed_at ?? undefined,
      notes: body.notes ?? undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, status, confirmed_at, proposed_slots")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ viewing: data });
}
