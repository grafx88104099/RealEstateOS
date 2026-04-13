import { createSupabaseServer } from "@/lib/supabase/server";
import { decodeJWT } from "@/lib/utils/jwt";
import { STATUS_LABELS, STATUS_COLORS, PROPERTY_TYPE_LABELS } from "@/lib/constants/listings";
import Link from "next/link";

function formatPrice(p: number) {
  if (p >= 1_000_000_000) return `${(p / 1_000_000_000).toFixed(1)} тэрбум`;
  if (p >= 1_000_000) return `${(p / 1_000_000).toFixed(0)} сая`;
  return p.toLocaleString();
}

export default async function AgentListingsPage() {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const payload = decodeJWT(session.access_token);
  const tenantId = payload.tenant_id as string;
  const userId = session.user.id;

  const { data: listings } = await supabase
    .from("listings")
    .select("id, title, status, price, rooms, area_sqm, district, property_type, listing_type, agent_id, created_at")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const myIds = new Set(listings?.filter((l) => l.agent_id === userId).map((l) => l.id));

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Зарууд</h1>
          <p className="text-sm text-gray-500 mt-1">
            {myIds.size} миний · {listings?.length ?? 0} нийт
          </p>
        </div>
        <Link href="/agent/listings/new"
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          + Шинэ зар
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
              <tr key={l.id} className={`hover:bg-gray-50 ${myIds.has(l.id) ? "" : "opacity-70"}`}>
                <td className="px-4 py-3">
                  <Link href={`/agent/listings/${l.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                    {l.title}
                  </Link>
                  {myIds.has(l.id) && (
                    <span className="ml-2 text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">Миний</span>
                  )}
                </td>
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
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Зар байхгүй байна</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
