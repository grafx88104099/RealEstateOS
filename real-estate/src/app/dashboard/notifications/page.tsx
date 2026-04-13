import { createSupabaseServer } from "@/lib/supabase/server";
import { decodeJWT } from "@/lib/utils/jwt";
import Link from "next/link";

interface NotificationItem {
  id: string;
  type: "warning" | "info" | "success" | "urgent";
  title: string;
  message: string;
  link?: string;
  date: string;
}

const TYPE_ICONS: Record<string, { bg: string; icon: string }> = {
  urgent: { bg: "bg-red-100 text-red-600", icon: "!" },
  warning: { bg: "bg-amber-100 text-amber-600", icon: "!" },
  info: { bg: "bg-blue-100 text-blue-600", icon: "i" },
  success: { bg: "bg-green-100 text-green-600", icon: "+" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Саяхан";
  if (mins < 60) return `${mins} мин`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} цаг`;
  const days = Math.floor(hours / 24);
  return `${days} өдөр`;
}

export default async function NotificationsPage() {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const payload = decodeJWT(session.access_token);
  const tenantId = payload.tenant_id as string;

  // Generate smart notifications from data
  const [unansweredInq, noEmbedding, inactiveAgents, recentSold] = await Promise.all([
    // Inquiries unanswered > 24 hours
    supabase.from("inquiries")
      .select("id, created_at, listing:listings(title), buyer:users!buyer_id(full_name, email)")
      .eq("tenant_id", tenantId)
      .eq("status", "new")
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(20),
    // Listings without embedding
    supabase.from("listings")
      .select("id, title")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .is("deleted_at", null)
      .is("embedding", null)
      .limit(10),
    // Inactive agents
    supabase.from("users")
      .select("id, full_name, email")
      .eq("tenant_id", tenantId)
      .eq("role", "agent")
      .eq("is_active", false)
      .is("deleted_at", null),
    // Recently sold
    supabase.from("listings")
      .select("id, title, price, agent:users!agent_id(full_name)")
      .eq("tenant_id", tenantId)
      .eq("status", "sold")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const notifications: NotificationItem[] = [];
  const now = new Date();

  // Unanswered inquiries (urgent if > 24h, warning if > 6h)
  for (const inq of unansweredInq.data ?? []) {
    const hoursDiff = (now.getTime() - new Date(inq.created_at).getTime()) / 3600000;
    const listing = inq.listing as { title: string } | null;
    const buyer = inq.buyer as { full_name: string | null; email: string } | null;

    if (hoursDiff > 24) {
      notifications.push({
        id: `inq-urgent-${inq.id}`,
        type: "urgent",
        title: `${Math.round(hoursDiff)} цаг хариулаагүй хүсэлт`,
        message: `"${listing?.title ?? "—"}" зарт ${buyer?.full_name || buyer?.email || "—"} хүсэлт илгээсэн`,
        link: "/dashboard/inquiries?status=new",
        date: inq.created_at,
      });
    } else if (hoursDiff > 6) {
      notifications.push({
        id: `inq-warn-${inq.id}`,
        type: "warning",
        title: "Хариулаагүй хүсэлт",
        message: `"${listing?.title ?? "—"}" зарт ${buyer?.full_name || buyer?.email || "—"} хүсэлт илгээсэн (${Math.round(hoursDiff)} цагийн өмнө)`,
        link: "/dashboard/inquiries?status=new",
        date: inq.created_at,
      });
    }
  }

  // No embedding warnings
  if ((noEmbedding.data?.length ?? 0) > 0) {
    notifications.push({
      id: "embed-warn",
      type: "warning",
      title: `${noEmbedding.data!.length} зарын AI хайлт идэвхжээгүй`,
      message: `${noEmbedding.data!.map((l) => l.title).slice(0, 3).join(", ")} — эдгээр зарууд хайлтад гарахгүй`,
      link: "/dashboard/listings",
      date: now.toISOString(),
    });
  }

  // Inactive agents
  if ((inactiveAgents.data?.length ?? 0) > 0) {
    notifications.push({
      id: "inactive-agents",
      type: "info",
      title: `${inactiveAgents.data!.length} идэвхгүй агент`,
      message: `${inactiveAgents.data!.map((a) => a.full_name || a.email).slice(0, 3).join(", ")}`,
      link: "/dashboard/users",
      date: now.toISOString(),
    });
  }

  // Recent sales
  for (const l of recentSold.data ?? []) {
    const agent = l.agent as { full_name: string | null } | null;
    notifications.push({
      id: `sold-${l.id}`,
      type: "success",
      title: "Зар зарагдсан",
      message: `"${l.title}" — ${Number(l.price).toLocaleString()}₮ (${agent?.full_name ?? "—"})`,
      link: `/dashboard/listings/${l.id}`,
      date: now.toISOString(),
    });
  }

  // Summary notification
  const newCount = unansweredInq.data?.length ?? 0;
  if (newCount > 0) {
    notifications.unshift({
      id: "summary",
      type: newCount > 5 ? "urgent" : "info",
      title: `Нийт ${newCount} шинэ хүсэлт`,
      message: "Хүсэлтүүдэд аль болох хурдан хариулна уу",
      link: "/dashboard/inquiries?status=new",
      date: now.toISOString(),
    });
  }

  // Sort: urgent first, then by type priority
  const priority: Record<string, number> = { urgent: 0, warning: 1, info: 2, success: 3 };
  notifications.sort((a, b) => (priority[a.type] ?? 9) - (priority[b.type] ?? 9));

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Мэдэгдлүүд</h1>
          <p className="text-sm text-gray-500 mt-1">{notifications.length} мэдэгдэл</p>
        </div>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← Буцах</Link>
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
            <span className="text-green-500 text-lg">+</span>
          </div>
          <p className="text-sm text-gray-900 font-medium">Бүх зүйл хэвийн</p>
          <p className="text-xs text-gray-400 mt-1">Анхаарах зүйл байхгүй</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const style = TYPE_ICONS[notif.type] ?? TYPE_ICONS.info;
            return (
              <div key={notif.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${style.bg}`}>
                  {style.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{notif.message}</p>
                </div>
                <div className="shrink-0 flex items-center gap-3">
                  <span className="text-xs text-gray-400">{timeAgo(notif.date)}</span>
                  {notif.link && (
                    <Link href={notif.link} className="text-xs font-medium text-blue-600 hover:text-blue-700">
                      Харах
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
