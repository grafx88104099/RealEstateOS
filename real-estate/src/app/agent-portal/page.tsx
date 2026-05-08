import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { decodeJWT, ROLE_HOME, AllowedRole } from "@/lib/utils/jwt";
import AgentPortalLoginForm from "./login-form";

export default async function AgentPortalPage() {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();

  // Аль хэдийн нэвтэрсэн бол dashboard руу
  if (session) {
    const payload = decodeJWT(session.access_token);
    const role = payload.user_role as AllowedRole | undefined;
    const home = (role && ROLE_HOME[role]) ? ROLE_HOME[role] : "/agent";
    // Server component redirect
    const { redirect } = await import("next/navigation");
    redirect(home);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">

      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
            ← Нийтийн хуудас
          </Link>
          <span className="text-gray-700">|</span>
          <span className="font-bold text-white">Real Estate OS</span>
          <span className="text-xs bg-white/10 text-gray-300 px-2 py-0.5 rounded font-medium">Pro</span>
        </div>
      </header>

      <div className="flex flex-1">

        {/* Left — branding */}
        <div className="hidden lg:flex flex-col justify-center px-16 flex-1 bg-gradient-to-br from-gray-900 to-gray-950">
          <div className="max-w-md">
            <h1 className="text-3xl font-bold text-white mb-4 leading-snug">
              Мэргэжлийн агентын<br />
              <span className="text-blue-400">хяналтын систем</span>
            </h1>
            <p className="text-gray-400 text-sm leading-relaxed mb-8">
              Зар удирдах, хүсэлт хянах, AI хайлт — бүгд нэг дор.
              Агентлагийн бүх багийг нэг платформд нэгтгэнэ.
            </p>
            <div className="space-y-3">
              {[
                "AI-д суурилсан семантик хайлт",
                "Tenant isolation — агентлаг бүр тусдаа орчин",
                "Хүсэлт удирдах pipeline",
                "Агент, admin, buyer — бүх role нэг систем",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm text-gray-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — login + register links */}
        <div className="flex flex-col justify-center items-center px-8 py-12 w-full lg:w-[460px] lg:border-l lg:border-white/10">
          <div className="w-full max-w-sm">

            <div className="mb-8">
              <h2 className="text-xl font-bold text-white">Нэвтрэх</h2>
              <p className="text-sm text-gray-400 mt-1">Агент болон агентлагийн бүртгэл</p>
            </div>

            <AgentPortalLoginForm />

            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-xs text-gray-500 text-center mb-4">Агентлаг бүртгүүлэх үү?</p>
              <Link
                href="/register?mode=agency"
                className="flex items-center justify-center w-full border border-white/20 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                Агентлаг бүртгүүлэх
              </Link>
              <p className="text-xs text-gray-600 text-center mt-3">
                Агент болохыг хүсвэл агентлагаасаа урилга аваарай
              </p>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
