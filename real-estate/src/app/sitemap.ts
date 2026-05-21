// Dynamic sitemap — active listings + static pages
import { MetadataRoute } from "next";
import { supabaseAdmin } from "@/lib/supabase/admin";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nemi.mn";

export const revalidate = 3600; // 1 цаг tutamд cache буцаах

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/listings`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/agents`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
  ];

  // Идэвхтэй listings — дээд тал нь 1000 (Google sitemap limit 50K, гэхдээ pagination холбохгүй)
  const { data: listings } = await supabaseAdmin
    .from("listings")
    .select("id, slug, updated_at")
    .eq("status", "active")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(1000);

  const listingPages: MetadataRoute.Sitemap = (listings ?? []).map((l) => ({
    url: `${SITE_URL}/listings/${l.id}`,
    lastModified: new Date(l.updated_at ?? Date.now()),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // Оффисуудын public хуудас
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tenants } = await (supabaseAdmin as any)
    .from("tenants")
    .select("slug, updated_at")
    .eq("status", "active")
    .is("deleted_at", null)
    .limit(500);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const officePages: MetadataRoute.Sitemap = ((tenants ?? []) as any[])
    .filter((t) => t.slug)
    .map((t) => ({
      url: `${SITE_URL}/offices/${t.slug}`,
      lastModified: new Date(t.updated_at ?? Date.now()),
      changeFrequency: "weekly",
      priority: 0.5,
    }));

  return [...staticPages, ...listingPages, ...officePages];
}
