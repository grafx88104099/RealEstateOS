import { createSupabaseServer } from "@/lib/supabase/server";
import { InquiryStatusBadge } from "@/components/inquiries/status-badge";
import { LeadScoreBadge } from "@/components/inquiries/lead-score-badge";
import { DraftReply } from "@/components/inquiries/draft-reply";
import Link from "next/link";

export default async function AgentInquiriesPage() {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data: inquiries } = await supabase
    .from("inquiries")
    .select(`
      id, status, message, created_at,
      listing:listings(id, title, price),
      buyer:users!buyer_id(id, full_name, email)
    `)
    .eq("agent_id", session.user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Хүсэлтүүд</h1>
        <p className="text-sm text-gray-500 mt-1">{inquiries?.length ?? 0} хүсэлт</p>
      </div>

      <div className="space-y-3">
        {inquiries?.map((inq) => {
          const listing = inq.listing as { id: string; title: string; price: number } | null;
          const buyer = inq.buyer as { full_name: string | null; email: string } | null;
          return (
            <div key={inq.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/agent/listings/${listing?.id}`} className="font-medium text-gray-900 hover:text-blue-600 truncate">
                      {listing?.title ?? "—"}
                    </Link>
                    <InquiryStatusBadge status={inq.status} />
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {buyer?.full_name || buyer?.email || "—"} · {new Date(inq.created_at).toLocaleDateString("mn-MN")}
                  </p>
                  {inq.message && <p className="text-sm text-gray-400 mt-1 line-clamp-2">{inq.message}</p>}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-2">
                  <LeadScoreBadge inquiryId={inq.id} />
                  {inq.status === "new" && <DraftReply inquiryId={inq.id} />}
                </div>
              </div>
            </div>
          );
        })}
        {(!inquiries || inquiries.length === 0) && (
          <div className="bg-white rounded-xl border border-gray-200 py-12 text-center text-gray-400">
            Хүсэлт байхгүй байна
          </div>
        )}
      </div>
    </div>
  );
}
