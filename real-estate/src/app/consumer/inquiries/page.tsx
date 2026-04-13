import { createSupabaseServer } from "@/lib/supabase/server";
import { InquiryStatusBadge } from "@/components/inquiries/status-badge";
import Link from "next/link";

function formatPrice(p: number) {
  if (p >= 1_000_000_000) return `${(p / 1_000_000_000).toFixed(1)} тэрбум₮`;
  if (p >= 1_000_000) return `${(p / 1_000_000).toFixed(0)} сая₮`;
  return `${p.toLocaleString()}₮`;
}

export default async function ConsumerInquiriesPage() {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data: inquiries } = await supabase
    .from("inquiries")
    .select(`
      id, status, message, created_at,
      listing:listings(id, title, price, district, rooms)
    `)
    .eq("buyer_id", session.user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Миний хүсэлтүүд</h1>
        <p className="text-sm text-gray-500 mt-1">{inquiries?.length ?? 0} хүсэлт</p>
      </div>

      <div className="space-y-3">
        {inquiries?.map((inq) => {
          const listing = inq.listing as { id: string; title: string; price: number; district: string | null; rooms: number | null } | null;
          return (
            <div key={inq.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 truncate">{listing?.title ?? "—"}</span>
                  <InquiryStatusBadge status={inq.status} />
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  {listing?.price ? formatPrice(listing.price) : "—"}
                  {listing?.district ? ` · ${listing.district}` : ""}
                  {listing?.rooms ? ` · ${listing.rooms} өрөө` : ""}
                  {" · "}{new Date(inq.created_at).toLocaleDateString("mn-MN")}
                </p>
                {inq.message && <p className="text-sm text-gray-400 mt-1 truncate">{inq.message}</p>}
              </div>
            </div>
          );
        })}
        {(!inquiries || inquiries.length === 0) && (
          <div className="bg-white rounded-xl border border-gray-200 py-12 text-center">
            <p className="text-gray-400">Хүсэлт байхгүй байна</p>
            <Link href="/consumer/search" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
              Зар хайж хүсэлт илгээх →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
