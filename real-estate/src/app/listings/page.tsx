// Public listings index — pagination + simple filters
import type { Metadata } from "next";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PROPERTY_TYPE_LABELS, LISTING_TYPE_LABELS } from "@/lib/constants/listings";

export const metadata: Metadata = {
  title: "Зарууд",
  description: "Идэвхтэй үл хөдлөх хөрөнгийн зарууд — Улаанбаатар хот, бүх дүүрэг.",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

function fmtPrice(price: number) {
  if (price >= 1_000_000_000) return `${(price / 1_000_000_000).toFixed(1)} тэрбум`;
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(0)} сая`;
  return price.toLocaleString("mn-MN");
}

export default async function PublicListingsIndex({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; district?: string; listing_type?: string; property_type?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (supabaseAdmin as any)
    .from("listings")
    .select("id, title, price, rooms, area_sqm, property_type, listing_type, district, created_at", { count: "exact" })
    .eq("status", "active")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (sp.district) q = q.eq("district", sp.district);
  if (sp.listing_type) q = q.eq("listing_type", sp.listing_type);
  if (sp.property_type) q = q.eq("property_type", sp.property_type);

  const { data: listings, count } = await q;
  const total = count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Cover images
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (listings ?? []) as any[];
  const ids = rows.map((r) => r.id as string);
  const coverMap = new Map<string, string>();
  if (ids.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: imgs } = await (supabaseAdmin as any)
      .from("listing_images")
      .select("listing_id, url, is_cover, sort_order")
      .in("listing_id", ids)
      .is("deleted_at", null)
      .order("is_cover", { ascending: false })
      .order("sort_order", { ascending: true });
    for (const r of (imgs ?? []) as { listing_id: string; url: string }[]) {
      if (!coverMap.has(r.listing_id)) coverMap.set(r.listing_id, r.url);
    }
  }

  const params = new URLSearchParams();
  if (sp.district) params.set("district", sp.district);
  if (sp.listing_type) params.set("listing_type", sp.listing_type);
  if (sp.property_type) params.set("property_type", sp.property_type);
  const pageUrl = (p: number) => {
    const u = new URLSearchParams(params);
    if (p > 1) u.set("page", String(p));
    const qs = u.toString();
    return `/listings${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-[family-name:var(--font-onest)] font-extrabold text-gray-900 text-xl tracking-tight lowercase">
            nemi
          </Link>
          <p className="text-sm text-gray-500">{total.toLocaleString("mn-MN")} зар</p>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Идэвхтэй зарууд</h1>

        {rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500">Зар олдсонгүй</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {rows.map((l) => {
              const cover = coverMap.get(l.id);
              return (
                <Link
                  key={l.id}
                  href={`/listings/${l.id}`}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt={l.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V20a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1V9.75z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h2 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">{l.title}</h2>
                    <p className="text-base font-bold text-indigo-600 mb-2">₮{fmtPrice(l.price)}</p>
                    <div className="flex flex-wrap gap-1.5 text-xs text-gray-500">
                      {l.rooms && <span>{l.rooms} өрөө</span>}
                      {l.area_sqm && <span>· {l.area_sqm} m²</span>}
                      {l.district && <span>· {l.district}</span>}
                    </div>
                    <div className="mt-2 flex gap-1.5">
                      <span className="text-[10px] uppercase tracking-wide text-gray-400">
                        {PROPERTY_TYPE_LABELS[l.property_type] ?? l.property_type}
                      </span>
                      <span className="text-[10px] uppercase tracking-wide text-gray-400">
                        · {LISTING_TYPE_LABELS[l.listing_type] ?? l.listing_type}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            {page > 1 && (
              <Link href={pageUrl(page - 1)} className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                ← Өмнөх
              </Link>
            )}
            <span className="px-3 py-2 text-sm text-gray-600">
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link href={pageUrl(page + 1)} className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                Дараах →
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
