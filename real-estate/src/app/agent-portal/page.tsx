import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { decodeJWT, ROLE_HOME, AllowedRole } from "@/lib/utils/jwt";
import AgentPortalLoginForm from "./login-form";
import WrongSessionNotice from "./wrong-session";

export default async function AgentPortalPage() {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();

  let isSuperAdmin = false;
  if (session) {
    const payload = decodeJWT(session.access_token);
    const role = payload.user_role as AllowedRole | undefined;
    if (role === "super_admin") {
      // super_admin-ыг redirect хийхгүй — энэ хуудсанд нэвтрэх ёсгүй гэдгийг мэдэгдэнэ
      isSuperAdmin = true;
    } else if (role && ROLE_HOME[role]) {
      // tenant_admin / agent / consumer гэх мэт нь өөр өөрийн нүүр рүү
      const { redirect } = await import("next/navigation");
      redirect(ROLE_HOME[role]);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-gray-200">
        <div className="max-w-screen-xl mx-auto px-6 py-3.5 flex items-center gap-4">
          <Link
            href="/agents"
            className="font-[family-name:var(--font-onest)] font-extrabold text-gray-900 text-2xl tracking-tight lowercase leading-none hover:text-indigo-600 transition-colors"
          >
            meni
          </Link>
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-semibold">Pro</span>
          <div className="flex-1" />
          <Link
            href="/"
            className="text-[13px] text-gray-600 hover:text-gray-900 font-medium px-3 py-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            ← Нийтийн хуудас
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Нэвтрэх</h1>
            <p className="text-sm text-gray-500 mt-2">Оффис болон агентын бүртгэл</p>
          </div>

          {isSuperAdmin ? (
            <WrongSessionNotice email={session!.user.email ?? ""} superAdminLink="/super" />
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
                <AgentPortalLoginForm />
              </div>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500">
                  Оффис нээж байгаа юу?{" "}
                  <Link href="/agents/onboard/account" className="text-indigo-600 hover:text-indigo-700 font-medium">
                    Шинэ оффис нээх
                  </Link>
                </p>
                <p className="text-xs text-gray-400 mt-3">
                  Агент болохыг хүсвэл оффисоосоо урилга аваарай
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
