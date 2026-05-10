import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
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
    tenantRow,
    totalListings, activeListings, soldListings,
    totalInquiries, newInquiries, closedWonInquiries,
    totalAgents, activeAgents,
    recentInquiries, recentListings, topAgents,
  ] = await Promise.all([
    supabaseAdmin.from("tenants").select("name, slug, logo_url, settings, subscription").eq("id", tenantId).single(),
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenant = (tenantRow.data ?? {}) as any;
  const tenantSettings = (tenant.settings ?? {}) as Record<string, string | undefined>;
  const tenantName: string = tenant.name ?? "Оффис";
  const tenantLogo: string | null = tenant.logo_url ?? null;
  const tenantPhone = tenantSettings.phone ?? "";
  const tenantAddress = tenantSettings.address ?? "";
  const tenantSubscription = tenant.subscription ?? "free";
  const setupPending = !tenantLogo || !tenantPhone || !tenantAddress;

  return (
    <div className="p-8 max-w-screen-2xl mx-auto">
      {/* Office identity card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 flex items-start gap-5 flex-wrap">
        <div className="flex-shrink-0 w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-100 to-violet-100 ring-2 ring-white shadow-sm flex items-center justify-center text-indigo-400">
          {tenantLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tenantLogo} alt={tenantName} className="w-full h-full object-cover" />
          ) : (
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V20a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1V9.75z" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{tenantName}</h1>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide ${
              tenantSubscription === "pro" ? "bg-purple-50 text-purple-700"
              : tenantSubscription === "enterprise" ? "bg-blue-50 text-blue-700"
              : "bg-gray-100 text-gray-600"
            }`}>
              {tenantSubscription}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {tenantPhone || "Утас оруулаагүй"}
            {tenantAddress ? ` · ${tenantAddress}` : ""}
          </p>
          <p className="text-xs text-gray-400 mt-1.5">Сайн байна уу, {session.user.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/settings" className="text-sm font-medium text-gray-700 bg-white border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            Тохиргоо
          </Link>
          <Link href="/dashboard/agents" className="text-sm font-medium text-gray-700 bg-white border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            Агентууд
          </Link>
          <Link href="/dashboard/listings/new" className="inline-flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:shadow-md hover:shadow-indigo-500/25 transition-all">
            + Шинэ зар
          </Link>
        </div>
      </div>

      {setupPending && (
        <div className="mb-6 flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 text-indigo-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-indigo-900">Оффисын мэдээллээ бөглөж дуусгах</p>
            <p className="text-xs text-indigo-700 mt-0.5">
              {!tenantLogo && "Лого · "}{!tenantPhone && "Утас · "}{!tenantAddress && "Хаяг "}нэмбэл харилцагчид итгэл өгөх боломжтой.
            </p>
          </div>
          <Link href="/dashboard/settings" className="text-xs font-medium text-indigo-700 bg-white hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-md transition-colors">
            Засах →
          </Link>
        </div>
      )}

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
            <Link href="/dashboard/agents" className="block text-xs text-blue-600 hover:underline">Агент урих</Link>
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
            <Link href="/dashboard/agents" className="text-xs text-blue-600 hover:underline">Бүгдийг харах</Link>
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
