import { createSupabaseServer } from "@/lib/supabase/server";
import { InquiryStatusSelect } from "@/components/inquiries/inquiry-status-select";
import { AssignAgent } from "@/components/inquiries/assign-agent";
import Link from "next/link";

function formatPrice(p: number) {
  if (p >= 1_000_000_000) return `${(p / 1_000_000_000).toFixed(1)} тэрбум₮`;
  if (p >= 1_000_000) return `${(p / 1_000_000).toFixed(0)} сая₮`;
  return `${p.toLocaleString()}₮`;
}

const STATUS_LABELS: Record<string, string> = {
  new: "Шинэ",
  contacted: "Холбогдсон",
  viewing_scheduled: "Үзлэг товлосон",
  negotiating: "Хэлэлцэж байна",
  closed_won: "Амжилттай",
  closed_lost: "Цуцалсан",
};

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createSupabaseServer();

  let query = supabase
    .from("inquiries")
    .select(`
      id, status, message, created_at,
      listing:listings(id, title, price),
      buyer:users!buyer_id(id, full_name, email),
      agent:users!agent_id(id, full_name)
    `)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (params.status) {
    query = query.eq("status", params.status as never);
  }

  const { data: inquiries } = await query;

  // Filter by search query (client-side for simplicity)
  let filtered = inquiries ?? [];
  if (params.q) {
    const q = params.q.toLowerCase();
    filtered = filtered.filter((inq) => {
      const listing = inq.listing as { title: string } | null;
      const buyer = inq.buyer as { full_name: string | null; email: string } | null;
      return (
        listing?.title?.toLowerCase().includes(q) ||
        buyer?.full_name?.toLowerCase().includes(q) ||
        buyer?.email?.toLowerCase().includes(q) ||
        inq.message?.toLowerCase().includes(q)
      );
    });
  }

  const statusCounts: Record<string, number> = {};
  for (const inq of inquiries ?? []) {
    statusCounts[inq.status] = (statusCounts[inq.status] ?? 0) + 1;
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Хүсэлтүүд</h1>
        <p className="text-sm text-gray-500 mt-1">{filtered.length} хүсэлт</p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          <Link
            href="/dashboard/inquiries"
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${!params.status ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            Бүгд ({inquiries?.length ?? 0})
          </Link>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <Link
              key={value}
              href={`/dashboard/inquiries?status=${value}`}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${params.status === value ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {label} ({statusCounts[value] ?? 0})
            </Link>
          ))}
        </div>
        <form className="ml-auto">
          <input
            name="q"
            defaultValue={params.q}
            placeholder="Хайх..."
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
          />
        </form>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Зар</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Худалдан авагч</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Агент</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Мессеж</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Төлөв</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Огноо</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((inq) => {
              const listing = inq.listing as { id: string; title: string; price: number } | null;
              const buyer = inq.buyer as { id: string; full_name: string | null; email: string } | null;
              const agent = inq.agent as { id: string; full_name: string | null } | null;
              return (
                <tr key={inq.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {listing ? (
                      <div>
                        <Link href={`/dashboard/listings/${listing.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                          {listing.title}
                        </Link>
                        <p className="text-gray-400 text-xs">{formatPrice(listing.price)}</p>
                      </div>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{buyer?.full_name || "—"}</p>
                    <p className="text-gray-500 text-xs">{buyer?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {agent?.full_name || "—"}
                    {inq.status === "new" && (
                      <AssignAgent inquiryId={inq.id} currentAgentName={agent?.full_name ?? undefined} />
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{inq.message || "—"}</td>
                  <td className="px-4 py-3">
                    <InquiryStatusSelect inquiryId={inq.id} currentStatus={inq.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(inq.created_at).toLocaleDateString("mn-MN")}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Хүсэлт олдсонгүй</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
