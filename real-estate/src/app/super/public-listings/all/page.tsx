import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin as typedAdmin } from "@/lib/supabase/admin";
import { ListingRowActions } from "@/components/super/public-listings/listing-row-actions";
import { StatusBadge } from "@/components/super/public-listings/status-badge";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAdmin = typedAdmin as unknown as SupabaseClient<any, any, any>;

export const dynamic = "force-dynamic";

const fmt = new Intl.NumberFormat("mn-MN");
const fmtMnt = (n: number | null | undefined) =>
  n == null ? "—" : `₮${fmt.format(n)}`;

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AllListingsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const status = (typeof sp.status === "string" ? sp.status : "") || null;
  const q = (typeof sp.q === "string" ? sp.q : "") || null;
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : "1"));
  const PAGE_SIZE = 30;
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabaseAdmin
    .from("listings")
    .select(
      `id, title, price, district, status, featured, view_count,
       created_at, deleted_at,
       tenant:tenants(id, name)`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);
  if (status) query = query.eq("status", status);
  if (q) query = query.ilike("title", `%${q}%`);
  if (!sp.include_deleted) query = query.is("deleted_at", null);

  const { data: rows, count, error } = await query;
  type Row = {
    id: string;
    title: string;
    price: number | null;
    district: string | null;
    status: string;
    featured: boolean;
    view_count: number;
    created_at: string;
    deleted_at: string | null;
    tenant: { id: string; name: string } | null;
  };
  const listings = (rows as Row[] | null) ?? [];

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Бүх зар</h1>
          <p className="text-sm text-gray-500 mt-1">
            {count ?? 0} зар • {page}/{totalPages} хуудас
          </p>
        </div>
        <Link
          href="/super/public-listings"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Буцах
        </Link>
      </div>

      <form className="flex gap-2 mb-4" method="GET">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Гарчгаар хайх..."
          className="flex-1 px-3 py-2 text-sm border rounded-lg"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="px-3 py-2 text-sm border rounded-lg"
        >
          <option value="">Бүх статус</option>
          <option value="pending_review">Хянуулж буй</option>
          <option value="active">Идэвхтэй</option>
          <option value="rejected">Татгалзсан</option>
          <option value="archived">Архивласан</option>
          <option value="sold">Зарагдсан</option>
          <option value="rented">Түрээсэлсэн</option>
          <option value="draft">Ноорог</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 text-sm rounded-lg bg-gray-900 text-white hover:bg-gray-800"
        >
          Шүүх
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
          {error.message}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium uppercase text-gray-500">Гарчиг</th>
              <th className="text-left px-4 py-3 text-xs font-medium uppercase text-gray-500">Агентлаг</th>
              <th className="text-left px-4 py-3 text-xs font-medium uppercase text-gray-500">Статус</th>
              <th className="text-right px-4 py-3 text-xs font-medium uppercase text-gray-500">Үнэ</th>
              <th className="text-right px-4 py-3 text-xs font-medium uppercase text-gray-500">Үзлэг</th>
              <th className="text-right px-4 py-3 text-xs font-medium uppercase text-gray-500">Үйлдэл</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {listings.map((l) => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/super/public-listings/${l.id}`}
                    className="font-medium text-gray-900 hover:text-blue-600"
                  >
                    {l.title}
                  </Link>
                  <div className="text-xs text-gray-500">
                    {l.district ?? "—"} · {new Date(l.created_at).toLocaleDateString("mn-MN")}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-700">{l.tenant?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 items-center">
                    <StatusBadge status={l.status} />
                    {l.featured && (
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                        ⭐
                      </span>
                    )}
                    {l.deleted_at && (
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-600">
                        Устгасан
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-medium">{fmtMnt(l.price)}</td>
                <td className="px-4 py-3 text-right text-gray-600">{l.view_count}</td>
                <td className="px-4 py-3 text-right">
                  <ListingRowActions
                    id={l.id}
                    status={l.status}
                    isDeleted={!!l.deleted_at}
                  />
                </td>
              </tr>
            ))}
            {listings.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                  Зар олдсонгүй.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {page > 1 && (
            <Link
              href={`?${new URLSearchParams({ ...(typeof q === "string" && q ? { q } : {}), ...(status ? { status } : {}), page: String(page - 1) }).toString()}`}
              className="px-3 py-1.5 text-sm rounded border hover:bg-gray-50"
            >
              ← Өмнөх
            </Link>
          )}
          <span className="px-3 py-1.5 text-sm text-gray-500">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`?${new URLSearchParams({ ...(typeof q === "string" && q ? { q } : {}), ...(status ? { status } : {}), page: String(page + 1) }).toString()}`}
              className="px-3 py-1.5 text-sm rounded border hover:bg-gray-50"
            >
              Дараах →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
