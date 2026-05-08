import { createSupabaseServer } from "@/lib/supabase/server";
import { STATUS_LABELS, STATUS_COLORS, PROPERTY_TYPE_LABELS } from "@/lib/constants/listings";
import Link from "next/link";

function formatPrice(p: number) {
  if (p >= 1_000_000_000) return `${(p / 1_000_000_000).toFixed(1)} тэрбум`;
  if (p >= 1_000_000) return `${(p / 1_000_000).toFixed(0)} сая`;
  return p.toLocaleString();
}

export default async function ConsumerMyListingsPage() {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data: listings } = await supabase
    .from("listings")
    .select("id, title, status, price, rooms, area_sqm, district, property_type, listing_type, created_at")
    .eq("seller_id", session.user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Миний зарууд</h1>
          <p className="text-sm text-gray-500 mt-1">{listings?.length ?? 0} зар</p>
        </div>
        <Link href="/consumer/my-listings/new"
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          + Зар нэмэх
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Гарчиг</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Төрөл</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Үнэ</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Дүүрэг</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Төлөв</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {listings?.map((l) => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{l.title}</td>
                <td className="px-4 py-3 text-gray-500">{PROPERTY_TYPE_LABELS[l.property_type] ?? l.property_type}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{formatPrice(l.price)}₮</td>
                <td className="px-4 py-3 text-gray-500">{l.district ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[l.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {STATUS_LABELS[l.status] ?? l.status}
                  </span>
                </td>
              </tr>
            ))}
            {(!listings || listings.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <p className="text-gray-400">Зар байхгүй байна</p>
                  <Link href="/consumer/my-listings/new" className="text-sm text-blue-600 hover:underline mt-1 inline-block">
                    Анхны зараа нэмэх →
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
