// GET    /api/listings/[id]/images — list images
// POST   /api/listings/[id]/images — upload image(s)
// PATCH  /api/listings/[id]/images — reorder / set cover
// DELETE /api/listings/[id]/images — delete image

import { NextRequest, NextResponse } from "next/server";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const auth = await withAuth(req, ["super_admin", "tenant_admin", "agent", "consumer"]);
  if (isAuthError(auth)) return auth;

  const { data, error } = await supabaseAdmin
    .from("listing_images")
    .select("id, url, thumbnail_url, alt_text, sort_order, is_cover, width, height, file_size, mime_type")
    .eq("listing_id", id)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ images: data ?? [] });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const auth = await withAuth(req, ["super_admin", "tenant_admin", "agent"]);
  if (isAuthError(auth)) return auth;

  const formData = await req.formData();
  const files = formData.getAll("files") as File[];

  if (!files.length) {
    return NextResponse.json({ error: "Зураг сонгоно уу" }, { status: 400 });
  }

  // Get current max sort_order
  const { data: existing } = await supabaseAdmin
    .from("listing_images")
    .select("sort_order")
    .eq("listing_id", id)
    .is("deleted_at", null)
    .order("sort_order", { ascending: false })
    .limit(1);

  let sortOrder = (existing?.[0]?.sort_order ?? -1) + 1;
  const isFirst = sortOrder === 0;

  const uploaded = [];

  for (const file of files) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const fileName = `${id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from("listing-images")
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      continue;
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from("listing-images")
      .getPublicUrl(fileName);

    const url = urlData.publicUrl;

    // Insert record
    const { data: img, error: insertError } = await supabaseAdmin
      .from("listing_images")
      .insert({
        listing_id: id,
        tenant_id: auth.tenantId,
        url,
        thumbnail_url: url,
        sort_order: sortOrder,
        is_cover: isFirst && sortOrder === 0,
        file_size: file.size,
        mime_type: file.type,
        alt_text: file.name,
      } as never)
      .select("id, url, thumbnail_url, sort_order, is_cover, file_size, mime_type")
      .single();

    if (!insertError && img) {
      uploaded.push(img);
      sortOrder++;
    }
  }

  return NextResponse.json({ images: uploaded }, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const auth = await withAuth(req, ["super_admin", "tenant_admin", "agent"]);
  if (isAuthError(auth)) return auth;

  let body: { action: string; image_id?: string; order?: { id: string; sort_order: number }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "set_cover" && body.image_id) {
    // Unset all covers
    await supabaseAdmin
      .from("listing_images")
      .update({ is_cover: false } as never)
      .eq("listing_id", id);

    // Set new cover
    await supabaseAdmin
      .from("listing_images")
      .update({ is_cover: true } as never)
      .eq("id", body.image_id);

    return NextResponse.json({ success: true });
  }

  if (body.action === "reorder" && body.order) {
    for (const item of body.order) {
      await supabaseAdmin
        .from("listing_images")
        .update({ sort_order: item.sort_order } as never)
        .eq("id", item.id);
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const auth = await withAuth(req, ["super_admin", "tenant_admin", "agent"]);
  if (isAuthError(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const imageId = searchParams.get("image_id");

  if (!imageId) {
    return NextResponse.json({ error: "image_id шаардлагатай" }, { status: 400 });
  }

  // Get image to delete from storage
  const { data: img } = await supabaseAdmin
    .from("listing_images")
    .select("url")
    .eq("id", imageId)
    .eq("listing_id", id)
    .single();

  if (img?.url) {
    // Extract path from URL
    const urlParts = img.url.split("/listing-images/");
    if (urlParts[1]) {
      await supabaseAdmin.storage.from("listing-images").remove([urlParts[1]]);
    }
  }

  // Soft delete
  await supabaseAdmin
    .from("listing_images")
    .update({ deleted_at: new Date().toISOString() } as never)
    .eq("id", imageId)
    .eq("listing_id", id);

  return NextResponse.json({ success: true });
}
