// lib/scraper/image-upload.ts
// Downloads image URLs and uploads them to the listing-images Supabase Storage bucket.
// Returns the public URLs in the bucket. Failures are logged and skipped.

import { supabaseAdmin } from "@/lib/supabase/admin";

const BUCKET = "listing-images";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const FETCH_TIMEOUT_MS = 12_000;

export interface UploadedImage {
  url: string;
  path: string;
  is_cover: boolean;
}

export interface UploadResult {
  uploaded: UploadedImage[];
  failed: { src: string; error: string }[];
}

export async function uploadListingImages(
  listingId: string,
  imageUrls: string[],
  opts: { referer?: string; max?: number } = {},
): Promise<UploadResult> {
  const max = opts.max ?? 3;
  const slice = imageUrls.filter(Boolean).slice(0, max);
  const uploaded: UploadedImage[] = [];
  const failed: { src: string; error: string }[] = [];

  for (let i = 0; i < slice.length; i++) {
    const src = slice[i];
    try {
      const res = await fetch(src, {
        headers: {
          "User-Agent":
            "meni-Bot/1.0 (+https://meni.mn/contact)",
          ...(opts.referer ? { Referer: opts.referer } : {}),
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) {
        failed.push({ src, error: `HTTP ${res.status}` });
        continue;
      }
      const ct = res.headers.get("content-type") ?? "";
      if (!ct.startsWith("image/")) {
        failed.push({ src, error: `not_image:${ct}` });
        continue;
      }
      const buf = await res.arrayBuffer();
      if (buf.byteLength > MAX_BYTES) {
        failed.push({ src, error: `too_large:${buf.byteLength}` });
        continue;
      }
      const ext = mimeToExt(ct);
      const path = `auto-import/${listingId}/${i}.${ext}`;

      const { error } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(path, new Uint8Array(buf), {
          contentType: ct,
          upsert: true,
        });
      if (error) {
        failed.push({ src, error: `upload:${error.message}` });
        continue;
      }
      const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
      uploaded.push({ url: pub.publicUrl, path, is_cover: i === 0 });
    } catch (err) {
      failed.push({ src, error: String(err).slice(0, 120) });
    }
  }

  return { uploaded, failed };
}

function mimeToExt(ct: string): string {
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("gif")) return "gif";
  return "jpg";
}
