import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
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

  // Оффисын мэдээлэл (sidebar header-т харуулах зориулалттай)
  const tenantId = payload.tenant_id as string | undefined;
  let tenantName = "Оффис";
  let tenantLogo: string | null = null;
  if (tenantId) {
    const { data: tRow } = await supabaseAdmin
      .from("tenants")
      .select("name, logo_url")
      .eq("id", tenantId)
      .single();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tenantName = ((tRow as any)?.name) || tenantName;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tenantLogo = ((tRow as any)?.logo_url) || null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-100">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="flex-shrink-0 w-9 h-9 rounded-lg overflow-hidden bg-gradient-to-br from-indigo-100 to-violet-100 ring-1 ring-gray-200 flex items-center justify-center text-indigo-400">
              {tenantLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tenantLogo} alt={tenantName} className="w-full h-full object-cover" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V20a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1V9.75z" />
                </svg>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                {tenantName}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">Оффисын админ</p>
            </div>
          </Link>
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
          <Link href="/dashboard/agents" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            Агентууд
          </Link>
          <Link href="/dashboard/users" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            Хэрэглэгчид
          </Link>
          <Link href="/dashboard/profile" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            Танилцуулга
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
