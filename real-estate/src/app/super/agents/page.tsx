import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import AgentRowActions from "./agent-row-actions";

interface AgentRow {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
  avatar_url: string | null;
  phone: string | null;
  tenant: { id: string; name: string } | null;
}

export default async function SuperAgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tenant?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const tenantFilter = sp.tenant ?? "";
  const statusFilter = sp.status ?? "";

  // Бүх tenants — шүүлтэд зориулсан
  const { data: tenants } = await supabaseAdmin
    .from("tenants")
    .select("id, name")
    .is("deleted_at", null)
    .order("name", { ascending: true });

  let query = supabaseAdmin
    .from("users")
    .select("id, email, full_name, is_active, created_at, avatar_url, phone, tenant:tenants(id, name)")
    .eq("role", "agent")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(500);

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  }
  if (tenantFilter) {
    query = query.eq("tenant_id", tenantFilter);
  }
  if (statusFilter === "active") query = query.eq("is_active", true);
  if (statusFilter === "inactive") query = query.eq("is_active", false);

  const { data: agentsRaw } = await query;
  const agents = (agentsRaw ?? []) as unknown as AgentRow[];

  // Тус бүрийн агентад харьяалагдах listings, inquiries тоо
  const ids = agents.map((a) => a.id);
  const listingCountMap = new Map<string, number>();
  const inquiryCountMap = new Map<string, number>();

  if (ids.length > 0) {
    const { data: listings } = await supabaseAdmin
      .from("listings")
      .select("agent_id")
      .in("agent_id", ids)
      .is("deleted_at", null);
    for (const l of (listings ?? []) as { agent_id: string }[]) {
      listingCountMap.set(l.agent_id, (listingCountMap.get(l.agent_id) ?? 0) + 1);
    }

    const { data: inquiries } = await supabaseAdmin
      .from("inquiries")
      .select("agent_id")
      .in("agent_id", ids)
      .is("deleted_at", null);
    for (const i of (inquiries ?? []) as { agent_id: string }[]) {
      inquiryCountMap.set(i.agent_id, (inquiryCountMap.get(i.agent_id) ?? 0) + 1);
    }
  }

  const total = agents.length;
  const activeCount = agents.filter((a) => a.is_active).length;

  return (
    <div className="p-8 max-w-screen-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Агентууд</h1>
        <p className="text-sm text-gray-500 mt-1">
          Системд бүртгэлтэй бүх агентуудыг харах, удирдах. Нийт {total} ·{" "}
          <span className="text-emerald-600 font-medium">{activeCount} идэвхтэй</span> ·{" "}
          <span className="text-rose-600 font-medium">{total - activeCount} хаагдсан</span>
        </p>
      </div>

      <form className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Нэр эсвэл имэйлээр хайх"
          className="flex-1 min-w-[200px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
        />
        <select
          name="tenant"
          defaultValue={tenantFilter}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
        >
          <option value="">Бүх оффис</option>
          {(tenants ?? []).map((t) => (
            <option key={(t as { id: string }).id} value={(t as { id: string }).id}>
              {(t as { name: string }).name}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={statusFilter}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
        >
          <option value="">Бүх төлөв</option>
          <option value="active">Идэвхтэй</option>
          <option value="inactive">Хаагдсан</option>
        </select>
        <button
          type="submit"
          className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Шүүх
        </button>
        {(q || tenantFilter || statusFilter) && (
          <Link
            href="/super/agents"
            className="text-sm text-gray-500 hover:text-gray-700 px-2"
          >
            Цэвэрлэх
          </Link>
        )}
      </form>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Агент</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Оффис</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Утас</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Зар</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Хүсэлт</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Огноо</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Төлөв</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Үйлдэл</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {agents.map((a) => {
              const tenant = a.tenant as { id: string; name: string } | null;
              const listingsN = listingCountMap.get(a.id) ?? 0;
              const inquiriesN = inquiryCountMap.get(a.id) ?? 0;
              return (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-400">
                        {a.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={a.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{a.full_name || "—"}</p>
                        <p className="text-xs text-gray-500 truncate">{a.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{tenant?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{a.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900 tabular-nums">{listingsN}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900 tabular-nums">{inquiriesN}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(a.created_at).toLocaleDateString("mn-MN")}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      a.is_active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"
                    }`}>
                      {a.is_active ? "Идэвхтэй" : "Хаагдсан"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <AgentRowActions id={a.id} isActive={a.is_active} />
                  </td>
                </tr>
              );
            })}
            {agents.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <p className="text-sm text-gray-400">Агент олдсонгүй</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
