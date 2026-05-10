import { createSupabaseServer } from "@/lib/supabase/server";
import { decodeJWT } from "@/lib/utils/jwt";
import { StatCard } from "@/components/ui/stat-card";
import { CommissionRateForm } from "@/components/analytics/commission-rate-form";
import Link from "next/link";

function formatPrice(p: number) {
  if (p >= 1_000_000_000) return `${(p / 1_000_000_000).toFixed(1)} тэрбум₮`;
  if (p >= 1_000_000) return `${(p / 1_000_000).toFixed(0)} сая₮`;
  return `${p.toLocaleString()}₮`;
}

export default async function CommissionsPage() {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const payload = decodeJWT(session.access_token);
  const tenantId = payload.tenant_id as string;

  // Get tenant settings for commission rate
  const { data: tenant } = await supabase
    .from("tenants")
    .select("settings")
    .eq("id", tenantId)
    .single();

  const settings = (tenant?.settings ?? {}) as Record<string, unknown>;
  const commissionRate = (settings.commission_rate as number) ?? 3;
  const agentSplit = (settings.agent_split as number) ?? 50;

  // Get all sold listings with agent info
  const { data: soldListings } = await supabase
    .from("listings")
    .select("id, title, price, district, property_type, agent_id, created_at, agent:users!agent_id(full_name, email)")
    .eq("tenant_id", tenantId)
    .eq("status", "sold")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const items = soldListings ?? [];

  // Calculate totals
  const totalSalesValue = items.reduce((s, l) => s + Number(l.price), 0);
  const totalCommission = Math.round(totalSalesValue * (commissionRate / 100));
  const agencyShare = Math.round(totalCommission * ((100 - agentSplit) / 100));
  const agentsShare = totalCommission - agencyShare;

  // Per-agent commission breakdown
  const agentCommissions: Record<string, { name: string; email: string; sales: number; value: number; commission: number }> = {};
  for (const l of items) {
    const agent = l.agent as { full_name: string | null; email: string } | null;
    const agentId = l.agent_id as string;
    if (!agentCommissions[agentId]) {
      agentCommissions[agentId] = {
        name: agent?.full_name || "—",
        email: agent?.email || "",
        sales: 0,
        value: 0,
        commission: 0,
      };
    }
    agentCommissions[agentId].sales++;
    agentCommissions[agentId].value += Number(l.price);
    agentCommissions[agentId].commission += Math.round(Number(l.price) * (commissionRate / 100) * (agentSplit / 100));
  }

  const agentList = Object.values(agentCommissions).sort((a, b) => b.commission - a.commission);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Комиссийн бүртгэл</h1>
          <p className="text-sm text-gray-500 mt-1">Борлуулалтын орлого ба агент комисс</p>
        </div>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← Буцах</Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Нийт борлуулалт" value={formatPrice(totalSalesValue)} sub={`${items.length} зар`} />
        <StatCard label="Нийт комисс" value={formatPrice(totalCommission)} sub={`${commissionRate}%`} />
        <StatCard label="Оффисын хувь" value={formatPrice(agencyShare)} sub={`${100 - agentSplit}%`} />
        <StatCard label="Агентуудын хувь" value={formatPrice(agentsShare)} sub={`${agentSplit}%`} />
      </div>

      {/* Commission Settings */}
      <div className="mb-8">
        <CommissionRateForm
          tenantId={tenantId}
          currentRate={commissionRate}
          currentSplit={agentSplit}
        />
      </div>

      {/* Per-Agent Breakdown */}
      {agentList.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">Агент бүрийн комисс</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Агент</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Борлуулалт</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Нийт дүн</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Комисс</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {agentList.map((a, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{a.name}</p>
                    <p className="text-xs text-gray-400">{a.email}</p>
                  </td>
                  <td className="px-4 py-3 text-center font-medium text-gray-600">{a.sales}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{formatPrice(a.value)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-green-600">{formatPrice(a.commission)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sold Listings Detail */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Зарагдсан зарууд</h2>
        </div>
        {items.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">Зарагдсан зар байхгүй</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Зар</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Агент</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Үнэ</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Комисс ({commissionRate}%)</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Огноо</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((l) => {
                const agent = l.agent as { full_name: string | null } | null;
                const commission = Math.round(Number(l.price) * (commissionRate / 100));
                return (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/listings/${l.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                        {l.title}
                      </Link>
                      <p className="text-xs text-gray-400">{l.district || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{agent?.full_name || "—"}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{formatPrice(Number(l.price))}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-600">{formatPrice(commission)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(l.created_at).toLocaleDateString("mn-MN")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
