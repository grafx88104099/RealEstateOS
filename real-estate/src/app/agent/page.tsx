import { createSupabaseServer } from "@/lib/supabase/server";
import { decodeJWT } from "@/lib/utils/jwt";
import { StatCard } from "@/components/ui/stat-card";
import { InquiryStatusBadge } from "@/components/inquiries/status-badge";
import { LeadScoreBadge } from "@/components/inquiries/lead-score-badge";
import Link from "next/link";

export default async function AgentHomePage() {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const payload = decodeJWT(session.access_token);
  const tenantId = payload.tenant_id as string;
  const userId = session.user.id;

  const [myListings, allListings, openInquiries, closedInquiries, recentInquiries, myActiveListings] = await Promise.all([
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("agent_id", userId).is("deleted_at", null),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).is("deleted_at", null),
    supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("agent_id", userId).eq("status", "new"),
    supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("agent_id", userId).in("status", ["closed_won", "closed_lost"]),
    supabase.from("inquiries")
      .select(`id, status, message, created_at, listing:listings(id, title), buyer:users!buyer_id(id, full_name, email)`)
      .eq("agent_id", userId)
      .eq("status", "new")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("listings")
      .select("id, title, price, district, rooms, property_type, embedding_updated_at")
      .eq("agent_id", userId)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const noEmbedding = myActiveListings.data?.filter((l) => !l.embedding_updated_at) ?? [];

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Сайн байна уу!</h1>
          <p className="text-sm text-gray-500 mt-1">{session.user.email}</p>
        </div>
        <Link href="/agent/listings/new"
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          + Шинэ зар
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Миний зарууд" value={myListings.count ?? 0} />
        <StatCard label="Нийт зар" value={allListings.count ?? 0} sub="агентлагт" />
        <StatCard label="Шинэ хүсэлт" value={openInquiries.count ?? 0} />
        <StatCard label="Хаагдсан хүсэлт" value={closedInquiries.count ?? 0} />
      </div>

      {/* AI Alerts */}
      {((openInquiries.count ?? 0) > 0 || noEmbedding.length > 0) && (
        <div className="mb-6 space-y-2">
          {(openInquiries.count ?? 0) > 3 && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <span className="text-red-500 text-lg">!</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-700">
                  {openInquiries.count} хариулаагүй хүсэлт байна
                </p>
                <p className="text-xs text-red-500">Хүсэлтүүдэд хурдан хариулснаар борлуулалт нэмэгдэнэ</p>
              </div>
              <Link href="/agent/inquiries" className="text-xs font-medium text-red-600 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-md transition-colors">
                Хариулах
              </Link>
            </div>
          )}
          {noEmbedding.length > 0 && (
            <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
              <span className="text-yellow-500 text-lg">!</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-700">
                  {noEmbedding.length} зарын AI хайлт идэвхжээгүй
                </p>
                <p className="text-xs text-yellow-500">Эдгээр зарууд хайлтад гарахгүй байна</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Inquiries */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">Шинэ хүсэлтүүд</h2>
            <Link href="/agent/inquiries" className="text-xs text-blue-600 hover:underline">Бүгдийг харах</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentInquiries.data?.map((inq) => {
              const listing = inq.listing as { id: string; title: string } | null;
              const buyer = inq.buyer as { full_name: string | null; email: string } | null;
              return (
                <div key={inq.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{listing?.title ?? "—"}</p>
                    <p className="text-xs text-gray-500">{buyer?.full_name || buyer?.email || "—"}</p>
                    {inq.message && <p className="text-xs text-gray-400 mt-0.5 truncate">{inq.message}</p>}
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <LeadScoreBadge inquiryId={inq.id} />
                    <InquiryStatusBadge status={inq.status} />
                  </div>
                </div>
              );
            })}
            {(!recentInquiries.data || recentInquiries.data.length === 0) && (
              <p className="px-5 py-6 text-center text-sm text-gray-400">Шинэ хүсэлт байхгүй байна</p>
            )}
          </div>
        </div>

        {/* Quick AI Actions */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">AI хэрэгслүүд</h2>
          </div>
          <div className="p-5 space-y-3">
            <Link
              href="/agent/listings/new"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition-colors group"
            >
              <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 group-hover:text-purple-700">AI зар тайлбар</p>
                <p className="text-xs text-gray-400">Мэргэжлийн тайлбар автомат бичүүлэх</p>
              </div>
            </Link>

            <Link
              href="/agent/inquiries"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-green-200 hover:bg-green-50 transition-colors group"
            >
              <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 group-hover:text-green-700">AI хариу бичих</p>
                <p className="text-xs text-gray-400">Хүсэлтэд автомат хариу үүсгэх</p>
              </div>
            </Link>

            <Link
              href="/agent/inquiries"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-red-200 hover:bg-red-50 transition-colors group"
            >
              <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 group-hover:text-red-600">Lead оноо</p>
                <p className="text-xs text-gray-400">Хүсэлтийн чанарыг AI-р үнэлэх</p>
              </div>
            </Link>

            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">
                Баруун доод буланд AI Туслах чат байна
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
