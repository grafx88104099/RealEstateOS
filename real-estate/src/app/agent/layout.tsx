import { createSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/auth/logout-button";
import { decodeJWT } from "@/lib/utils/jwt";
import { CopilotChat } from "@/components/ai/copilot-chat";

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const payload = decodeJWT(session.access_token);
  const role = payload.user_role as string | undefined;
  if (role !== "agent") redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-100">
          <span className="font-[family-name:var(--font-onest)] font-extrabold text-gray-900 text-xl tracking-tight lowercase">nemi</span>
          <p className="text-xs text-gray-400 mt-0.5">Агент</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <Link href="/agent" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            Хяналтын самбар
          </Link>
          <Link href="/agent/listings" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            Зарууд
          </Link>
          <Link href="/agent/inquiries" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            Хүсэлтүүд
          </Link>
          <Link href="/" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 rounded-lg hover:bg-gray-100 transition-colors">
            Нийтийн хайлт
          </Link>
        </nav>
        <div className="px-3 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 px-3 mb-2 truncate">{session.user.email}</p>
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
      <CopilotChat />
    </div>
  );
}
