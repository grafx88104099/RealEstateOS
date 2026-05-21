// Suspended — sa түр хаасан
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { decodeJWT } from "@/lib/utils/jwt";

export default async function SuspendedPage() {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const tenantId = decodeJWT(session.access_token).tenant_id as string;

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("name")
    .eq("id", tenantId)
    .single();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = tenant as any;

  return (
    <div className="max-w-2xl mx-auto p-6 sm:p-8">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-orange-100 text-orange-600 mx-auto mb-5 flex items-center justify-center">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Хандалт түр зогссон</h1>
        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          Таны <strong>{t?.name ?? "оффис"}</strong> оффис түр хаагдсан байна. Лавлахын тулд админ багтай холбоо барина уу.
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
