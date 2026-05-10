// POST /api/office/logo — оффисын лого upload. tenant_admin only.
// FormData "file" талбар шаардана. Supabase Storage 'office-logos' bucket руу.
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { decodeJWT } from "@/lib/utils/jwt";

const BUCKET = "office-logos";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];

async function ensureBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    await supabaseAdmin.storage.createBucket(BUCKET, { public: true });
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Нэвтрээгүй" }, { status: 401 });

  const payload = decodeJWT(session.access_token);
  const role = payload.user_role;
  const tenantId = payload.tenant_id as string | undefined;
  if (role !== "tenant_admin") {
    return NextResponse.json({ error: "Зөвхөн оффисын админ" }, { status: 403 });
  }
  if (!tenantId) {
    return NextResponse.json({ error: "tenant_id JWT-д алга" }, { status: 400 });
  }

  let form: FormData;
  try { form = await req.formData(); }
  catch { return NextResponse.json({ error: "FormData шаардана" }, { status: 400 }); }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file талбар алга" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Файл хэт том (5MB-аас бага)" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Зөвхөн зураг (jpg/png/webp/svg)" }, { status: 400 });
  }

  await ensureBucket();

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${tenantId}/${Date.now()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buf, { contentType: file.type, upsert: false });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  const url = urlData.publicUrl;

  await supabaseAdmin
    .from("tenants")
    .update({ logo_url: url, updated_at: new Date().toISOString() })
    .eq("id", tenantId);

  return NextResponse.json({ url });
}
