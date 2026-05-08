import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { target_url } = await req.json();

  if (!target_url) {
    return NextResponse.json({ error: "target_url required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("qr_links")
    .update({ target_url })
    .eq("slug", slug)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
