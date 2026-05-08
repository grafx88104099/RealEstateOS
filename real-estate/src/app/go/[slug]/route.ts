import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const { data } = await supabase
    .from("qr_links")
    .select("id, target_url")
    .eq("slug", slug)
    .single();

  if (!data) {
    return NextResponse.redirect(new URL("/", _req.url));
  }

  // Increment scan count
  supabase.rpc("increment_scan_count", { link_id: data.id }).then(() => {});

  const target = data.target_url.startsWith("http")
    ? data.target_url
    : new URL(data.target_url, _req.url).toString();

  return NextResponse.redirect(target);
}
