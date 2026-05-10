import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import AISearch from "@/components/search/ai-search";

export default async function ConsumerSearchPage() {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  let hasPreferences = false;
  if (session) {
    const { data } = await supabase
      .from("buyer_preferences")
      .select("id")
      .eq("user_id", session.user.id)
      .maybeSingle();
    hasPreferences = !!data;
  }

  return (
    <div className="p-8 max-w-screen-xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/consumer"
            aria-label="Буцах"
            className="flex-shrink-0 w-9 h-9 rounded-full bg-white border border-gray-200 hover:bg-gray-100 flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">Зар хайх</h1>
            <p className="text-sm text-gray-500 mt-1">AI ашиглан байгалийн хэлээр хайлт хийх</p>
          </div>
        </div>
        <Link
          href="/consumer/preferences"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-4 py-2 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          Сонирхол тохируулах
        </Link>
      </div>

      {!hasPreferences && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-900">AI тохирол идэвхжүүлэх</p>
            <p className="text-xs text-blue-600 mt-0.5">Сонирхлоо тохируулбал таны хайлтад тохирох зарыг автоматаар санал болгоно</p>
          </div>
          <Link href="/consumer/preferences" className="text-sm font-medium text-blue-700 hover:text-blue-900 whitespace-nowrap ml-4">
            Тохируулах →
          </Link>
        </div>
      )}

      <AISearch />
    </div>
  );
}
