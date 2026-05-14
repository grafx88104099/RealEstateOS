// POST /api/users/[id]/avatar — админ агентын профайл зургийг байршуулах
// tenant_admin/super_admin эрхтэй. 'avatars' bucket руу хадгална.
import { NextRequest, NextResponse } from "next/server";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

const BUCKET = "avatars";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

async function ensureBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    await supabaseAdmin.storage.createBucket(BUCKET, { public: true });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await withAuth(req, ["tenant_admin", "super_admin"]);
  if (isAuthError(auth)) return auth;

  const { id } = await params;

  const { data: target } = await supabaseAdmin
    .from("users")
    .select("id, tenant_id, role")
    .eq("id", id)
    .single();

  if (!target) {
    return NextResponse.json({ error: "Олдсонгүй" }, { status: 404 });
  }
  if (auth.role === "tenant_admin" && target.tenant_id !== auth.tenantId) {
    return NextResponse.json({ error: "Олдсонгүй" }, { status: 404 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "FormData шаардана" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file талбар алга" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Файл хэт том (5MB-аас бага)" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Зөвхөн зураг (jpg/png/webp/gif)" }, { status: 400 });
  }

  await ensureBucket();

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${id}/${Date.now()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buf, { contentType: file.type, upsert: false });
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  const url = urlData.publicUrl;

  await supabaseAdmin
    .from("users")
    .update({ avatar_url: url, updated_at: new Date().toISOString() } as never)
    .eq("id", id);

  return NextResponse.json({ url });
}
