// GET /api/buyer/matches — AI-matched listings for consumer based on preferences embedding

import { NextRequest, NextResponse } from "next/server";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { matchListingsForBuyer } from "@/lib/ai/search";

export async function GET(req: NextRequest) {
  const auth = await withAuth(req, ["consumer"]);
  if (isAuthError(auth)) return auth;

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "10"), 50);
  const threshold = Number(url.searchParams.get("threshold") ?? "0.25");

  try {
    const results = await matchListingsForBuyer(auth.userId, auth.tenantId, supabaseAdmin, {
      threshold,
      limit,
    });
    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Matching failed";
    if (message.includes("no embedding")) {
      return NextResponse.json({ results: [], reason: "no_preferences" });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
