import { createSupabaseServer } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { searchListings } from "@/lib/ai/search";

export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Session байхгүй" });
  }

  try {
    const result = await searchListings(
      "СБД 3 өрөө байр",
      "d6b57718-55d1-4f9c-87ad-61243e9428ab",
      supabase,
      { threshold: 0.3, limit: 5 }
    );
    return NextResponse.json({ ok: true, count: result.results.length, results: result.results });
  } catch (e) {
    return NextResponse.json({ error: String(e) });
  }
}
