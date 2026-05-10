import { createSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import HeaderLogout from "./header-logout";
import { decodeJWT } from "@/lib/utils/jwt";

export default async function ConsumerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const payload = decodeJWT(session.access_token);
  const role = payload.user_role as string | undefined;
  // /consumer нь зөвхөн consumer role-той хэрэглэгчдэд (бүрэн тусгаарлагдсан account).
  // Agent болон tenant_admin нь өөрсдийн ажлын самбар руу буцна.
  if (role !== "consumer") {
    if (role === "agent") redirect("/agent");
    if (role === "tenant_admin") redirect("/dashboard");
    if (role === "super_admin") redirect("/super");
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-gray-200/70">
        <div className="max-w-screen-xl mx-auto px-6 py-3.5 flex items-center gap-4">
          <Link
            href="/"
            className="font-[family-name:var(--font-onest)] font-extrabold text-gray-900 text-2xl tracking-tight lowercase leading-none hover:text-indigo-600 transition-colors"
          >
            meni
          </Link>
          <div className="flex-1" />
          <span className="text-sm text-gray-600 hidden sm:inline truncate max-w-[220px]">
            {session.user.email}
          </span>
          <HeaderLogout />
        </div>
      </header>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
