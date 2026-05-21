// Pending approval — имэйл баталгаажсан боловч sa зөвшөөрөл хүлээж буй
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { decodeJWT } from "@/lib/utils/jwt";

export default async function PendingApprovalPage() {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const tenantId = decodeJWT(session.access_token).tenant_id as string;

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("name, email_verified_at")
    .eq("id", tenantId)
    .single();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = tenant as any;

  return (
    <div className="max-w-2xl mx-auto p-6 sm:p-8">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 mx-auto mb-5 flex items-center justify-center">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Хүсэлт хүлээгдэж байна</h1>
        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          Таны <strong>{t?.name ?? "оффис"}</strong> оффисын хүсэлтийг манай админ баг шалгаж байна.
          Ихэвчлэн <strong>24 цагийн дотор</strong> хариу имэйлээр илгээгдэнэ.
        </p>

        <div className="bg-gray-50 rounded-xl p-5 text-left mb-6">
          <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-200">
            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Имэйл баталгаажсан</p>
              <p className="text-xs text-gray-500">
                {t?.email_verified_at ? new Date(t.email_verified_at).toLocaleString("mn-MN") : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-200">
            <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="4" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Админ шалгаж байна</p>
              <p className="text-xs text-gray-500">24 цагт хүрэхгүй</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-400">Идэвхжүүлэлт</p>
              <p className="text-xs text-gray-400">Имэйлээр мэдэгдэнэ</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-400">
          Лавлах асуудал гарвал <a href="mailto:hello@nemi.mn" className="text-indigo-600 hover:underline">hello@nemi.mn</a>
        </p>
      </div>
    </div>
  );
}
