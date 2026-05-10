import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { decodeJWT } from "@/lib/utils/jwt";
import { WizardHeader } from "../wizard-steps";

export default async function OnboardDonePage() {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/agents/onboard/account");
  const role = decodeJWT(session.access_token).user_role;
  if (role !== "tenant_admin") redirect("/");

  return (
    <>
      <WizardHeader current="done" />
      <main className="max-w-screen-md mx-auto px-6 py-16 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 mb-6">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Оффис амжилттай нээгдлээ!
        </h1>
        <p className="text-gray-600 mt-3 max-w-md mx-auto">
          Одоо хяналтын самбараас зар нэмэх, агент удирдах, хүсэлт хянах боломжтой.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold px-6 py-3 rounded-full hover:shadow-lg hover:shadow-indigo-500/30 transition-all"
          >
            Хяналтын самбар руу
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <Link
            href="/dashboard/listings"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 px-6 py-3 rounded-full hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Эхний зар нэмэх
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          <NextStep title="Зар нэмэх" desc="Эхний үл хөдлөх хөрөнгөө бүртгэж нийтэл." href="/dashboard/listings" />
          <NextStep title="Агент удирдах" desc="Нэмэлт агентуудаа уриад эрх олго." href="/dashboard/users" />
          <NextStep title="Тохиргоо" desc="Оффисын мэдээлэл, лого засах." href="/dashboard/settings" />
        </div>
      </main>
    </>
  );
}

function NextStep({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <Link
      href={href}
      className="group block rounded-xl border border-gray-200 bg-white p-4 hover:border-indigo-200 hover:shadow-sm transition-all"
    >
      <h3 className="font-semibold text-sm text-gray-900 group-hover:text-indigo-700 transition-colors">
        {title}
      </h3>
      <p className="text-xs text-gray-500 mt-1">{desc}</p>
    </Link>
  );
}
