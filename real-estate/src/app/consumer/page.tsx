import { createSupabaseServer } from "@/lib/supabase/server";
import { StatCard } from "@/components/ui/stat-card";
import { InquiryStatusBadge } from "@/components/inquiries/status-badge";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/constants/listings";
import Link from "next/link";

function formatPrice(p: number) {
  if (p >= 1_000_000_000) return `${(p / 1_000_000_000).toFixed(1)} тэрбум₮`;
  if (p >= 1_000_000) return `${(p / 1_000_000).toFixed(0)} сая₮`;
  return `${p.toLocaleString()}₮`;
}

export default async function ConsumerHomePage() {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const userId = session.user.id;

  const [sentInquiries, myListings, activeListings, recentInquiries, recentListings, preferences] = await Promise.all([
    supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("buyer_id", userId),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("seller_id", userId).is("deleted_at", null),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("seller_id", userId).eq("status", "active").is("deleted_at", null),
    supabase.from("inquiries")
      .select(`id, status, created_at, listing:listings(id, title, price, district)`)
      .eq("buyer_id", userId)
      .order("created_at", { ascending: false })
      .limit(4),
    supabase.from("listings")
      .select("id, title, status, price, district")
      .eq("seller_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase.from("buyer_preferences").select("id").eq("user_id", userId).single(),
  ]);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Сайн байна уу!</h1>
          <p className="text-sm text-gray-500 mt-1">{session.user.email}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/consumer/search"
            className="text-sm font-medium text-blue-600 border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors">
            Зар хайх
          </Link>
          <Link href="/consumer/my-listings/new"
            className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            + Зар нэмэх
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Илгээсэн хүсэлт" value={sentInquiries.count ?? 0} />
        <StatCard label="Миний зарууд" value={myListings.count ?? 0} />
        <StatCard label="Идэвхтэй зар" value={activeListings.count ?? 0} />
      </div>

      {!preferences.data && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-900">AI тохирол идэвхжүүлэх</p>
            <p className="text-xs text-blue-600 mt-0.5">Сонирхлоо тохируулбал таны хайлтад тохирох зарыг автоматаар санал болгоно</p>
          </div>
          <Link href="/consumer/preferences" className="text-sm font-medium text-blue-700 hover:text-blue-900 whitespace-nowrap ml-4">
            Тохируулах →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Илгээсэн хүсэлтүүд */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">Илгээсэн хүсэлтүүд</h2>
            <Link href="/consumer/inquiries" className="text-xs text-blue-600 hover:underline">Бүгд</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentInquiries.data?.map((inq) => {
              const listing = inq.listing as { id: string; title: string; price: number; district: string | null } | null;
              return (
                <div key={inq.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[180px]">{listing?.title ?? "—"}</p>
                    <p className="text-xs text-gray-500">{listing?.price ? formatPrice(listing.price) : "—"}{listing?.district ? ` · ${listing.district}` : ""}</p>
                  </div>
                  <InquiryStatusBadge status={inq.status} />
                </div>
              );
            })}
            {(!recentInquiries.data || recentInquiries.data.length === 0) && (
              <div className="px-5 py-6 text-center">
                <p className="text-sm text-gray-400">Хүсэлт байхгүй</p>
                <Link href="/consumer/search" className="text-xs text-blue-600 hover:underline mt-1 inline-block">Зар хайх →</Link>
              </div>
            )}
          </div>
        </div>

        {/* Миний зарууд */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">Миний зарууд</h2>
            <Link href="/consumer/my-listings" className="text-xs text-blue-600 hover:underline">Бүгд</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentListings.data?.map((l) => (
              <div key={l.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 truncate max-w-[180px]">{l.title}</p>
                  <p className="text-xs text-gray-500">{formatPrice(l.price)}{l.district ? ` · ${l.district}` : ""}</p>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[l.status] ?? "bg-gray-100"}`}>
                  {STATUS_LABELS[l.status] ?? l.status}
                </span>
              </div>
            ))}
            {(!recentListings.data || recentListings.data.length === 0) && (
              <div className="px-5 py-6 text-center">
                <p className="text-sm text-gray-400">Зар байхгүй</p>
                <Link href="/consumer/my-listings/new" className="text-xs text-blue-600 hover:underline mt-1 inline-block">Зар нэмэх →</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
