import { createSupabaseServer } from "@/lib/supabase/server";
import { decodeJWT } from "@/lib/utils/jwt";
import { StatCard } from "@/components/ui/stat-card";
import { InquiryStatusBadge } from "@/components/inquiries/status-badge";
import Link from "next/link";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} мин`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} цаг`;
  const days = Math.floor(hours / 24);
  return `${days} өдөр`;
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const payload = decodeJWT(session.access_token);
  const tenantId = payload.tenant_id as string;

  const [
    totalListings, activeListings, soldListings,
    totalInquiries, newInquiries, closedWonInquiries,
    totalAgents, activeAgents,
    recentInquiries, recentListings, topAgents,
  ] = await Promise.all([
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).is("deleted_at", null),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "active").is("deleted_at", null),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "sold").is("deleted_at", null),
    supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).is("deleted_at", null),
    supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "new").is("deleted_at", null),
    supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "closed_won").is("deleted_at", null),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("role", "agent").is("deleted_at", null),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("role", "agent").eq("is_active", true).is("deleted_at", null),
    // Recent inquiries
    supabase.from("inquiries")
      .select(`id, status, message, created_at, listing:listings(id, title), buyer:users!buyer_id(full_name, email), agent:users!agent_id(full_name)`)
      .eq("tenant_id", tenantId).is("deleted_at", null)
      .order("created_at", { ascending: false }).limit(5),
    // Recent listings
    supabase.from("listings")
      .select("id, title, price, status, district, created_at, agent:users!agent_id(full_name)")
      .eq("tenant_id", tenantId).is("deleted_at", null)
      .order("created_at", { ascending: false }).limit(5),
    // Top agents by listing count
    supabase.from("users")
      .select("id, full_name, email")
      .eq("tenant_id", tenantId).eq("role", "agent").eq("is_active", true).is("deleted_at", null)
      .limit(5),
  ]);

  const conversionRate = (totalInquiries.count ?? 0) > 0
    ? Math.round(((closedWonInquiries.count ?? 0) / (totalInquiries.count ?? 1)) * 100)
    : 0;

  // Unanswered inquiry alert
  const unansweredCount = newInquiries.count ?? 0;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Хяналтын самбар</h1>
          <p className="text-sm text-gray-500 mt-1">Сайн байна уу, {session.user.email}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/users" className="text-sm font-medium text-gray-600 bg-white border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            Хэрэглэгчид
          </Link>
          <Link href="/dashboard/listings/new" className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            + Шинэ зар
          </Link>
        </div>
      </div>

      {/* Alerts */}
      {unansweredCount > 0 && (
        <div className="mb-6 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <span className="text-amber-600 text-sm font-bold">!</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">{unansweredCount} хариулаагүй хүсэлт байна</p>
            <p className="text-xs text-amber-600">Хүсэлтүүдэд хурдан хариулснаар борлуулалт нэмэгдэнэ</p>
          </div>
          <Link href="/dashboard/inquiries" className="text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-md transition-colors">
            Харах
          </Link>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Нийт зар" value={totalListings.count ?? 0} sub={`${activeListings.count ?? 0} идэвхтэй`} />
        <StatCard label="Зарагдсан" value={soldListings.count ?? 0} sub="нийт борлуулалт" />
        <StatCard label="Хүсэлт" value={totalInquiries.count ?? 0} sub={`${unansweredCount} шинэ`} />
        <StatCard label="Конверс" value={`${conversionRate}%`} sub={`${closedWonInquiries.count ?? 0} амжилттай`} />
        <StatCard label="Нийт агент" value={totalAgents.count ?? 0} sub={`${activeAgents.count ?? 0} идэвхтэй`} />
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Шуурхай үйлдлүүд</p>
          <div className="mt-2 space-y-1.5">
            <Link href="/dashboard/analytics" className="block text-xs text-purple-600 hover:underline font-medium">Аналитик & AI тойм</Link>
            <Link href="/dashboard/commissions" className="block text-xs text-green-600 hover:underline font-medium">Комиссийн бүртгэл</Link>
            <Link href="/dashboard/users" className="block text-xs text-blue-600 hover:underline">Агент урих</Link>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Inquiries */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">Сүүлийн хүсэлтүүд</h2>
            <Link href="/dashboard/inquiries" className="text-xs text-blue-600 hover:underline">Бүгдийг харах</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentInquiries.data?.map((inq) => {
              const listing = inq.listing as { id: string; title: string } | null;
              const buyer = inq.buyer as { full_name: string | null; email: string } | null;
              const agent = inq.agent as { full_name: string | null } | null;
              return (
                <div key={inq.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/listings/${listing?.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate">
                        {listing?.title ?? "—"}
                      </Link>
                      <InquiryStatusBadge status={inq.status} />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {buyer?.full_name || buyer?.email || "—"}
                      {agent?.full_name ? ` → ${agent.full_name}` : ""}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{timeAgo(inq.created_at)}</span>
                </div>
              );
            })}
            {(!recentInquiries.data || recentInquiries.data.length === 0) && (
              <p className="px-5 py-6 text-center text-sm text-gray-400">Хүсэлт байхгүй</p>
            )}
          </div>
        </div>

        {/* Recent Listings */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">Сүүлийн зарууд</h2>
            <Link href="/dashboard/listings" className="text-xs text-blue-600 hover:underline">Бүгдийг харах</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentListings.data?.map((l) => {
              const agent = l.agent as { full_name: string | null } | null;
              return (
                <div key={l.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/dashboard/listings/${l.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate block">
                      {l.title}
                    </Link>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {Number(l.price).toLocaleString()}₮ · {l.district || "—"}
                      {agent?.full_name ? ` · ${agent.full_name}` : ""}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{timeAgo(l.created_at)}</span>
                </div>
              );
            })}
            {(!recentListings.data || recentListings.data.length === 0) && (
              <p className="px-5 py-6 text-center text-sm text-gray-400">Зар байхгүй</p>
            )}
          </div>
        </div>

        {/* Agent Overview */}
        <div className="bg-white rounded-xl border border-gray-200 lg:col-span-2">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">Агентууд</h2>
            <Link href="/dashboard/users" className="text-xs text-blue-600 hover:underline">Бүгдийг харах</Link>
          </div>
          <div className="p-5">
            {topAgents.data && topAgents.data.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {topAgents.data.map((agent) => (
                  <div key={agent.id} className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto text-sm font-bold">
                      {(agent.full_name || agent.email)?.[0]?.toUpperCase() || "?"}
                    </div>
                    <p className="text-sm font-medium text-gray-900 mt-2 truncate">{agent.full_name || "—"}</p>
                    <p className="text-xs text-gray-400 truncate">{agent.email}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-gray-400 py-4">Агент урих шаардлагатай</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
