import { createSupabaseServer } from "@/lib/supabase/server";
import { decodeJWT } from "@/lib/utils/jwt";
import { StatCard } from "@/components/ui/stat-card";
import { AiDigestCard } from "@/components/analytics/ai-digest-card";
import Link from "next/link";

function formatPrice(p: number) {
  if (p >= 1_000_000_000) return `${(p / 1_000_000_000).toFixed(1)} тэрбум₮`;
  if (p >= 1_000_000) return `${(p / 1_000_000).toFixed(0)} сая₮`;
  return `${p.toLocaleString()}₮`;
}

interface AgentMetric {
  id: string;
  full_name: string | null;
  email: string;
  is_active: boolean;
  total_listings: number;
  active_listings: number;
  sold_listings: number;
  total_inquiries: number;
  new_inquiries: number;
  closed_won: number;
  closed_lost: number;
  conversion_rate: number;
  avg_response_hours: number;
  recent_listings_30d: number;
  recent_inquiries_30d: number;
  sales_value: number;
}

export default async function AnalyticsPage() {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const payload = decodeJWT(session.access_token);
  const tenantId = payload.tenant_id as string;

  // Fetch all agents with their stats
  const { data: agents } = await supabase
    .from("users")
    .select("id, full_name, email, is_active, created_at")
    .eq("tenant_id", tenantId)
    .eq("role", "agent")
    .is("deleted_at", null);

  const agentIds = (agents ?? []).map((a) => a.id);

  const [listingsRes, inquiriesRes] = await Promise.all([
    agentIds.length > 0
      ? supabase.from("listings")
          .select("id, agent_id, status, price, created_at")
          .eq("tenant_id", tenantId)
          .in("agent_id", agentIds)
          .is("deleted_at", null)
      : Promise.resolve({ data: [] }),
    agentIds.length > 0
      ? supabase.from("inquiries")
          .select("id, agent_id, status, created_at, contacted_at")
          .eq("tenant_id", tenantId)
          .in("agent_id", agentIds)
          .is("deleted_at", null)
      : Promise.resolve({ data: [] }),
  ]);

  const listings = listingsRes.data ?? [];
  const inquiries = inquiriesRes.data ?? [];

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const agentMetrics: AgentMetric[] = (agents ?? []).map((agent) => {
    const al = listings.filter((l) => l.agent_id === agent.id);
    const ai = inquiries.filter((i) => i.agent_id === agent.id);

    const soldListings = al.filter((l) => l.status === "sold");
    const closedWon = ai.filter((i) => i.status === "closed_won").length;
    const totalInq = ai.length;

    const responded = ai.filter((i) => i.contacted_at);
    let avgHours = 0;
    if (responded.length > 0) {
      const totalH = responded.reduce((s, i) => {
        return s + (new Date(i.contacted_at!).getTime() - new Date(i.created_at).getTime()) / 3600000;
      }, 0);
      avgHours = Math.round((totalH / responded.length) * 10) / 10;
    }

    return {
      id: agent.id,
      full_name: agent.full_name,
      email: agent.email,
      is_active: agent.is_active,
      total_listings: al.length,
      active_listings: al.filter((l) => l.status === "active").length,
      sold_listings: soldListings.length,
      total_inquiries: totalInq,
      new_inquiries: ai.filter((i) => i.status === "new").length,
      closed_won: closedWon,
      closed_lost: ai.filter((i) => i.status === "closed_lost").length,
      conversion_rate: totalInq > 0 ? Math.round((closedWon / totalInq) * 100) : 0,
      avg_response_hours: avgHours,
      recent_listings_30d: al.filter((l) => new Date(l.created_at).getTime() > thirtyDaysAgo).length,
      recent_inquiries_30d: ai.filter((i) => new Date(i.created_at).getTime() > thirtyDaysAgo).length,
      sales_value: soldListings.reduce((s, l) => s + Number(l.price), 0),
    };
  }).sort((a, b) => {
    const sa = a.conversion_rate * 2 + a.sold_listings * 10 + a.total_listings * 3;
    const sb = b.conversion_rate * 2 + b.sold_listings * 10 + b.total_listings * 3;
    return sb - sa;
  });

  const totalSold = agentMetrics.reduce((s, a) => s + a.sold_listings, 0);
  const totalSalesValue = agentMetrics.reduce((s, a) => s + a.sales_value, 0);
  const totalInquiries = agentMetrics.reduce((s, a) => s + a.total_inquiries, 0);
  const totalClosedWon = agentMetrics.reduce((s, a) => s + a.closed_won, 0);
  const overallConversion = totalInquiries > 0 ? Math.round((totalClosedWon / totalInquiries) * 100) : 0;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Аналитик</h1>
          <p className="text-sm text-gray-500 mt-1">Агентуудын гүйцэтгэл ба AI тойм</p>
        </div>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← Буцах</Link>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="Нийт агент" value={agents?.length ?? 0} sub={`${agents?.filter((a) => a.is_active).length ?? 0} идэвхтэй`} />
        <StatCard label="Нийт борлуулалт" value={totalSold} sub="зарагдсан" />
        <StatCard label="Борлуулалтын дүн" value={formatPrice(totalSalesValue)} />
        <StatCard label="Нийт хүсэлт" value={totalInquiries} />
        <StatCard label="Конверс" value={`${overallConversion}%`} sub={`${totalClosedWon} амжилттай`} />
      </div>

      {/* AI Digest */}
      <div className="mb-8">
        <AiDigestCard />
      </div>

      {/* Agent Performance Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Агентуудын гүйцэтгэл</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Агент</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Зар</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Зарагдсан</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Хүсэлт</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Шинэ</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Конверс</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Хариу (цаг)</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Борлуулалт</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">30 хоног</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {agentMetrics.map((agent, idx) => (
                <tr key={agent.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      idx === 0 ? "bg-yellow-100 text-yellow-700" :
                      idx === 1 ? "bg-gray-100 text-gray-600" :
                      idx === 2 ? "bg-orange-100 text-orange-700" :
                      "bg-gray-50 text-gray-400"
                    }`}>
                      {idx + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{agent.full_name || "—"}</p>
                    <p className="text-xs text-gray-400">{agent.email}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-medium text-gray-900">{agent.total_listings}</span>
                    <span className="text-xs text-gray-400 ml-1">({agent.active_listings})</span>
                  </td>
                  <td className="px-4 py-3 text-center font-medium text-green-600">{agent.sold_listings}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{agent.total_inquiries}</td>
                  <td className="px-4 py-3 text-center">
                    {agent.new_inquiries > 0 ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-50 text-red-600">
                        {agent.new_inquiries}
                      </span>
                    ) : (
                      <span className="text-gray-300">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-semibold ${
                      agent.conversion_rate >= 30 ? "text-green-600" :
                      agent.conversion_rate >= 15 ? "text-yellow-600" :
                      "text-gray-400"
                    }`}>
                      {agent.conversion_rate}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {agent.avg_response_hours > 0 ? (
                      <span className={`text-xs font-medium ${
                        agent.avg_response_hours <= 2 ? "text-green-600" :
                        agent.avg_response_hours <= 12 ? "text-yellow-600" :
                        "text-red-500"
                      }`}>
                        {agent.avg_response_hours}ц
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {agent.sales_value > 0 ? formatPrice(agent.sales_value) : "—"}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-500">
                    {agent.recent_listings_30d} зар · {agent.recent_inquiries_30d} хүсэлт
                  </td>
                </tr>
              ))}
              {agentMetrics.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">Агент байхгүй</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
