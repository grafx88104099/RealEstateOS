// GET    /api/listings/[id]/images — list images
// POST   /api/listings/[id]/images — upload image(s)
// PATCH  /api/listings/[id]/images — reorder / set cover
// DELETE /api/listings/[id]/images — delete image
//
// Аюулгүй байдал: бүх state-changing үйлдэл (POST/PATCH/DELETE)-д
// listing-ийн tenant_id auth.tenantId-тэй таарч буйг шалгана.
// Үгүй бол cross-tenant зураг устгах/нэмэх боломжтой байсан.

import { NextRequest, NextResponse } from "next/server";
import { withAuth, isAuthError, AuthContext } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

// Listing-ийн tenant_id шалгаж, агентын хувьд агент эзэмшил шалгана
async function assertListingAccess(
  listingId: string,
  auth: AuthContext,
): Promise<{ ok: true; listing: { tenant_id: string; agent_id: string } } | { ok: false; res: NextResponse }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: listing } = await (supabaseAdmin as any)
    .from("listings")
    .select("tenant_id, agent_id")
    .eq("id", listingId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!listing) {
    return { ok: false, res: NextResponse.json({ error: "Зар олдсонгүй" }, { status: 404 }) };
  }
  if (auth.role !== "super_admin" && listing.tenant_id !== auth.tenantId) {
    return { ok: false, res: NextResponse.json({ error: "Зөвшөөрөлгүй" }, { status: 403 }) };
  }
  if (auth.role === "agent" && listing.agent_id !== auth.userId) {
    return { ok: false, res: NextResponse.json({ error: "Зөвхөн өөрийн зарын зургийг засна" }, { status: 403 }) };
  }
  return { ok: true, listing };
}

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

  const access = await assertListingAccess(id, auth);
  if (!access.ok) return access.res;

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
    // File validation
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: `"${file.name}" хэт том (10MB-аас бага)` }, { status: 400 });
    }
    if (!ALLOWED_MIME.includes(file.type)) {
      return NextResponse.json({ error: `"${file.name}" зураг биш (jpg/png/webp/gif)` }, { status: 400 });
    }

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
        tenant_id: access.listing.tenant_id, // Listing-ээс ирэх (auth.tenantId биш — super_admin support)
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

  const access = await assertListingAccess(id, auth);
  if (!access.ok) return access.res;

  let body: { action: string; image_id?: string; order?: { id: string; sort_order: number }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "set_cover" && body.image_id) {
    // Unset all covers — listing-ээр scope (өмнө нь global байсан буг)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any)
      .from("listing_images")
      .update({ is_cover: false })
      .eq("listing_id", id);

    // Set new cover — image нь тухайн listing-д хамаарах ёстой
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any)
      .from("listing_images")
      .update({ is_cover: true })
      .eq("id", body.image_id)
      .eq("listing_id", id);

    return NextResponse.json({ success: true });
  }

  if (body.action === "reorder" && body.order) {
    for (const item of body.order) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabaseAdmin as any)
        .from("listing_images")
        .update({ sort_order: item.sort_order })
        .eq("id", item.id)
        .eq("listing_id", id); // Зөвхөн өөрийн listing-ийн зургийг л өөрчилнө
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const auth = await withAuth(req, ["super_admin", "tenant_admin", "agent"]);
  if (isAuthError(auth)) return auth;

  const access = await assertListingAccess(id, auth);
  if (!access.ok) return access.res;

  const { searchParams } = new URL(req.url);
  const imageId = searchParams.get("image_id");

  if (!imageId) {
    return NextResponse.json({ error: "image_id шаардлагатай" }, { status: 400 });
  }

  // Get image to delete from storage — зөвхөн зөв listing-ийн зургийг
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
