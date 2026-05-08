import { createSupabaseServer } from "@/lib/supabase/server";
import { decodeJWT } from "@/lib/utils/jwt";
import Link from "next/link";

interface ActivityItem {
  id: string;
  type: "listing" | "inquiry" | "user";
  action: string;
  title: string;
  detail: string;
  date: string;
}

const TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  listing: { bg: "bg-blue-50", text: "text-blue-700", label: "Зар" },
  inquiry: { bg: "bg-green-50", text: "text-green-700", label: "Хүсэлт" },
  user: { bg: "bg-purple-50", text: "text-purple-700", label: "Хэрэглэгч" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Саяхан";
  if (mins < 60) return `${mins} мин`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} цаг`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} өдөр`;
  return new Date(dateStr).toLocaleDateString("mn-MN");
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const payload = decodeJWT(session.access_token);
  const tenantId = payload.tenant_id as string;

  // Build activity feed from existing data
  const [listingsRes, inquiriesRes, usersRes] = await Promise.all([
    supabase.from("listings")
      .select("id, title, status, created_at, agent:users!agent_id(full_name)")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.from("inquiries")
      .select("id, status, created_at, listing:listings(title), buyer:users!buyer_id(full_name, email), agent:users!agent_id(full_name)")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.from("users")
      .select("id, full_name, email, role, is_active, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const activities: ActivityItem[] = [];

  // Listings activity
  for (const l of listingsRes.data ?? []) {
    const agent = l.agent as { full_name: string | null } | null;
    const statusLabel: Record<string, string> = {
      active: "нийтэлсэн", draft: "ноорог үүсгэсэн", sold: "зарагдсан гэж тэмдэглэсэн",
      archived: "архивласан", rented: "түрээслэгдсэн гэж тэмдэглэсэн",
    };
    activities.push({
      id: `l-${l.id}`,
      type: "listing",
      action: statusLabel[l.status] ?? l.status,
      title: l.title,
      detail: agent?.full_name ?? "—",
      date: l.created_at,
    });
  }

  // Inquiries activity
  for (const i of inquiriesRes.data ?? []) {
    const listing = i.listing as { title: string } | null;
    const buyer = i.buyer as { full_name: string | null; email: string } | null;
    const statusLabel: Record<string, string> = {
      new: "шинэ хүсэлт ирсэн", contacted: "холбогдсон", viewing_scheduled: "үзлэг товлосон",
      negotiating: "хэлэлцэж байна", closed_won: "амжилттай хаагдсан", closed_lost: "цуцалсан",
    };
    activities.push({
      id: `i-${i.id}`,
      type: "inquiry",
      action: statusLabel[i.status] ?? i.status,
      title: listing?.title ?? "—",
      detail: buyer?.full_name || buyer?.email || "—",
      date: i.created_at,
    });
  }

  // Users activity
  for (const u of usersRes.data ?? []) {
    const roleLabel: Record<string, string> = {
      agent: "агент", tenant_admin: "админ", consumer: "хэрэглэгч",
    };
    activities.push({
      id: `u-${u.id}`,
      type: "user",
      action: `${roleLabel[u.role] ?? u.role} бүртгэгдсэн`,
      title: u.full_name || u.email,
      detail: u.email,
      date: u.created_at,
    });
  }

  // Sort by date desc
  activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Filter
  const filtered = params.type
    ? activities.filter((a) => a.type === params.type)
    : activities;

  const typeCounts: Record<string, number> = {};
  for (const a of activities) typeCounts[a.type] = (typeCounts[a.type] ?? 0) + 1;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Үйл ажиллагааны бүртгэл</h1>
          <p className="text-sm text-gray-500 mt-1">{filtered.length} бүртгэл</p>
        </div>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← Буцах</Link>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-1.5">
        <Link href="/dashboard/audit-log"
          className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${!params.type ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          Бүгд ({activities.length})
        </Link>
        {Object.entries(TYPE_STYLES).map(([key, style]) => (
          <Link key={key} href={`/dashboard/audit-log?type=${key}`}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${params.type === key ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {style.label} ({typeCounts[key] ?? 0})
          </Link>
        ))}
      </div>

      {/* Activity Feed */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="divide-y divide-gray-100">
          {filtered.slice(0, 100).map((item) => {
            const style = TYPE_STYLES[item.type] ?? TYPE_STYLES.listing;
            return (
              <div key={item.id} className="px-5 py-3 flex items-center gap-4">
                <div className="shrink-0">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}>
                    {style.label}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{item.title}</span>
                    <span className="text-gray-400"> — </span>
                    <span className="text-gray-600">{item.action}</span>
                  </p>
                  <p className="text-xs text-gray-400">{item.detail}</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{timeAgo(item.date)}</span>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-gray-400">Бүртгэл олдсонгүй</p>
          )}
        </div>
      </div>
    </div>
  );
}
