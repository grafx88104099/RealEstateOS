import { createSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/auth/logout-button";
import { decodeJWT } from "@/lib/utils/jwt";

export default async function ConsumerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const payload = decodeJWT(session.access_token);
  const role = payload.user_role as string | undefined;
  if (role !== "consumer") redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-100">
          <Link href="/" className="font-bold text-gray-900 text-sm hover:text-blue-600 transition-colors">
            Real Estate OS
          </Link>
          <p className="text-xs text-gray-400 mt-0.5">Хэрэглэгч</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <Link href="/consumer" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            Нүүр
          </Link>
          <Link href="/consumer/search" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            Хайлт
          </Link>
          <Link href="/consumer/inquiries" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            Хүсэлтүүд
          </Link>
          <Link href="/consumer/my-listings" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            Миний зарууд
          </Link>
          <Link href="/consumer/preferences" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            Сонирхол
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
