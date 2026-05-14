import { createSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import LogoutButton from "@/components/auth/logout-button";
import { decodeJWT } from "@/lib/utils/jwt";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const pathname = headersList.get("x-next-pathname") ?? headersList.get("x-invoke-path") ?? "";

  // /super/login хуудсанд auth шалгалт хийхгүй
  if (pathname === "/super/login") {
    return <>{children}</>;
  }

  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/super/login");

  const payload = decodeJWT(session.access_token);
  const role = payload.user_role as string | undefined;
  if (role !== "super_admin") redirect("/super/login");

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-100">
          <span className="font-[family-name:var(--font-onest)] font-extrabold text-gray-900 text-xl tracking-tight lowercase">nemi</span>
          <p className="text-xs text-red-500 mt-0.5 font-medium">Super Admin</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <Link href="/super" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            Нүүр
          </Link>
          <Link href="/super/tenants" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            Оффисууд
          </Link>
          <Link href="/super/agents" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            Агентууд
          </Link>
          <Link href="/super/users" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            Хэрэглэгчид
          </Link>
          <Link href="/super/public-listings" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            Нийтийн зарууд
          </Link>
          <Link href="/super/scraper" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            AI Scraper
          </Link>
          <Link href="/super/usa-survey" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            USAsurvey
          </Link>
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
