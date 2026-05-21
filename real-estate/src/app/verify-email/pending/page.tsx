// "Имэйлээ шалгана уу" хуудас — нэвтэрсэн tenant_admin status=pending_email үед энд ирнэ.
// Resend товчтой client component.

import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { decodeJWT } from "@/lib/utils/jwt";
import ResendVerifyButton from "./resend-button";

export default async function VerifyEmailPendingPage() {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const jwt = decodeJWT(session.access_token);
  const tenantId = jwt.tenant_id as string | undefined;
  const role = jwt.user_role as string | undefined;
  if (!tenantId || role !== "tenant_admin") redirect("/");

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("name, status")
    .eq("id", tenantId)
    .single();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = tenant as any;

  // Аль хэдийн verify хийсэн бол dashboard руу redirect (тэр нь pending/active хуудас руу аваачна)
  if (!t || t.status !== "pending_email") redirect("/dashboard");

  const email = session.user.email ?? "";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-600 mx-auto mb-4 flex items-center justify-center">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Имэйлээ шалгана уу</h1>
        <p className="text-sm text-gray-600 mb-2 leading-relaxed">
          Бид <strong className="text-gray-900">{email}</strong> хаяг руу баталгаажуулах холбоос илгээлээ.
        </p>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          Холбоос дарсны дараа таны хүсэлт админд шилжих болно.
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 text-left">
          <p className="text-xs text-amber-800 leading-relaxed">
            💡 <strong>Spam</strong> эсвэл <strong>Promotions</strong> хавтсаа бас шалгаарай. Холбоос 24 цагт хүчинтэй.
          </p>
        </div>

        <ResendVerifyButton />

        <p className="text-xs text-gray-400 mt-6">
          Имэйл буруу байна уу? <a href="mailto:hello@nemi.mn" className="text-indigo-600 hover:underline">Тусламж авах</a>
        </p>
      </div>
    </div>
  );
}
