// Rejected — sa татгалзсан
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { decodeJWT } from "@/lib/utils/jwt";

export default async function RejectedPage() {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const tenantId = decodeJWT(session.access_token).tenant_id as string;

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("name, rejection_reason")
    .eq("id", tenantId)
    .single();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = tenant as any;

  return (
    <div className="max-w-2xl mx-auto p-6 sm:p-8">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 mx-auto mb-5 flex items-center justify-center">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Хүсэлт зөвшөөрөгдөөгүй</h1>
        <p className="text-sm text-gray-600 leading-relaxed mb-5">
          Уучлаарай — таны <strong>{t?.name ?? "оффис"}</strong> оффисын хүсэлтийг одоохондоо зөвшөөрөх боломжгүй боллоо.
        </p>

        {t?.rejection_reason && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 text-left mb-6">
            <p className="text-xs font-semibold text-rose-700 uppercase tracking-wide mb-2">Шалтгаан</p>
            <p className="text-sm text-rose-800 leading-relaxed whitespace-pre-wrap">{t.rejection_reason}</p>
          </div>
        )}

        <p className="text-sm text-gray-600 mb-2">
          Шинээр хүсэлт илгээх, эсвэл асуудлаа лавлахын тулд:
        </p>
        <a
          href="mailto:hello@nemi.mn"
          className="inline-flex items-center justify-center bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:shadow-md transition-all"
        >
          hello@nemi.mn-руу холбоо барих
        </a>
      </div>
    </div>
  );
}
