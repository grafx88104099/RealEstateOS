import { createSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/auth/logout-button";
import { decodeJWT } from "@/lib/utils/jwt";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const payload = decodeJWT(session.access_token);
  const role = payload.user_role as string | undefined;

  if (role && role !== "tenant_admin" && role !== "super_admin") {
    const roleHomes: Record<string, string> = {
      agent: "/agent", seller: "/seller", buyer: "/buyer",
    };
    redirect(roleHomes[role] ?? "/login");
  }

  // Notification count
  const { count: newInquiryCount } = await supabase
    .from("inquiries")
    .select("id", { count: "exact", head: true })
    .eq("status", "new")
    .is("deleted_at", null);

  const notifCount = newInquiryCount ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-100">
          <span className="font-bold text-gray-900 text-sm">Real Estate OS</span>
          <p className="text-xs text-gray-400 mt-0.5">Агентлагийн админ</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            Хяналтын самбар
          </Link>
          <Link href="/dashboard/listings" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            Зарууд
          </Link>
          <Link href="/dashboard/inquiries" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            Хүсэлтүүд
            {notifCount > 0 && (
              <span className="ml-auto inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold">
                {notifCount > 9 ? "9+" : notifCount}
              </span>
            )}
          </Link>
          <Link href="/dashboard/users" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            Хэрэглэгчид
          </Link>

          <div className="pt-2 mt-2 border-t border-gray-100">
            <p className="px-3 py-1 text-xs text-gray-400 font-medium uppercase tracking-wider">Удирдлага</p>
          </div>

          <Link href="/dashboard/analytics" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            Аналитик
          </Link>
          <Link href="/dashboard/market" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            Зах зээл
          </Link>
          <Link href="/dashboard/commissions" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            Комисс
          </Link>
          <Link href="/dashboard/scraper" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            Зар цуглуулагч
          </Link>
          <Link href="/dashboard/notifications" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            Мэдэгдэл
            {notifCount > 0 && (
              <span className="ml-auto w-2 h-2 rounded-full bg-red-500" />
            )}
          </Link>
          <Link href="/dashboard/audit-log" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            Бүртгэл
          </Link>
          <Link href="/dashboard/settings" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            Тохиргоо
          </Link>

          <div className="pt-2 mt-2 border-t border-gray-100">
            <Link href="/" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 rounded-lg hover:bg-gray-100 transition-colors">
              Нийтийн хайлт
            </Link>
          </div>
        </nav>
        <div className="px-3 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 px-3 mb-2 truncate">{session.user.email}</p>
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
