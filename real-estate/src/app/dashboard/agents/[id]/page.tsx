import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { decodeJWT } from "@/lib/utils/jwt";
import { UserActions } from "../../users/user-actions";
import { InquiryStatusBadge } from "@/components/inquiries/status-badge";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/constants/listings";
import AgentProfileEditor from "./agent-profile-editor";

function fmtPrice(p: number) {
  if (p >= 1_000_000_000) return `${(p / 1_000_000_000).toFixed(1)} тэрбум`;
  if (p >= 1_000_000) return `${Math.round(p / 1_000_000)} сая`;
  return p.toLocaleString();
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} мин`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} цаг`;
  const days = Math.floor(hours / 24);
  return `${days} өдөр`;
}

export default async function DashboardAgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const jwt = decodeJWT(session.access_token);
  const tenantId = jwt.tenant_id as string;
  const userRole = jwt.user_role as string | undefined;
  const canEdit = userRole === "tenant_admin" || userRole === "super_admin";

  const { id } = await params;

  const { data: agent } = await supabase
    .from("users")
    .select("id, email, full_name, role, is_active, created_at, avatar_url, phone, tenant_id, metadata")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = agent as any;
  if (!a || a.tenant_id !== tenantId || a.role !== "agent") notFound();

  const meta = (a.metadata ?? {}) as {
    bio?: string;
    experience_years?: number | null;
    specialties?: string[];
    languages?: string[];
  };
  const bio = meta.bio ?? "";
  const experienceYears = meta.experience_years ?? null;
  const specialties = Array.isArray(meta.specialties) ? meta.specialties : [];
  const languages = Array.isArray(meta.languages) ? meta.languages : [];
  const hasProfileInfo =
    bio || experienceYears != null || specialties.length > 0 || languages.length > 0;

  const [
    totalListings, activeListings, soldListings,
    totalInquiries, newInquiries, wonInquiries,
    recentListings, recentInquiries,
  ] = await Promise.all([
    supabase.from("listings").select("id", { count: "exact", head: true })
      .eq("agent_id", id).is("deleted_at", null),
    supabase.from("listings").select("id", { count: "exact", head: true })
      .eq("agent_id", id).eq("status", "active").is("deleted_at", null),
    supabase.from("listings").select("id", { count: "exact", head: true })
      .eq("agent_id", id).eq("status", "sold").is("deleted_at", null),
    supabase.from("inquiries").select("id", { count: "exact", head: true })
      .eq("agent_id", id).is("deleted_at", null),
    supabase.from("inquiries").select("id", { count: "exact", head: true })
      .eq("agent_id", id).eq("status", "new").is("deleted_at", null),
    supabase.from("inquiries").select("id", { count: "exact", head: true })
      .eq("agent_id", id).eq("status", "closed_won").is("deleted_at", null),
    supabase.from("listings")
      .select("id, title, price, status, district, created_at")
      .eq("agent_id", id).is("deleted_at", null)
      .order("created_at", { ascending: false }).limit(5),
    supabase.from("inquiries")
      .select(`id, status, message, created_at, listing:listings(id, title), buyer:users!buyer_id(full_name, email)`)
      .eq("agent_id", id).is("deleted_at", null)
      .order("created_at", { ascending: false }).limit(5),
  ]);

  const conversionRate = (totalInquiries.count ?? 0) > 0
    ? Math.round(((wonInquiries.count ?? 0) / (totalInquiries.count ?? 1)) * 100)
    : 0;

  return (
    <div className="p-8 max-w-screen-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard/agents"
          aria-label="Буцах"
          className="flex-shrink-0 w-9 h-9 rounded-full bg-white border border-gray-200 hover:bg-gray-100 flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">{a.full_name || "—"}</h1>
          <p className="text-sm text-gray-500 mt-0.5 truncate">{a.email}</p>
        </div>
      </div>

      {/* Profile карт */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 flex flex-wrap items-start gap-5">
        <div className="flex-shrink-0 w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-indigo-100 to-violet-100 ring-2 ring-white shadow-sm flex items-center justify-center text-indigo-400">
          {a.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.avatar_url} alt={a.full_name ?? ""} className="w-full h-full object-cover" />
          ) : (
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              a.is_active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            }`}>
              {a.is_active ? "Идэвхтэй" : "Хаагдсан"}
            </span>
            {experienceYears != null && experienceYears > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">
                {experienceYears} жилийн туршлага
              </span>
            )}
            <span className="text-xs text-gray-500">
              Бүртгэлтэй: {new Date(a.created_at).toLocaleDateString("mn-MN")}
            </span>
          </div>
          <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-gray-500">Имэйл</dt>
              <dd className="text-gray-900 truncate">{a.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Утас</dt>
              <dd className="text-gray-900">{a.phone || "—"}</dd>
            </div>
          </dl>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
          {canEdit && (
            <AgentProfileEditor
              agentId={a.id}
              initial={{
                full_name: a.full_name ?? "",
                phone: a.phone ?? "",
                avatar_url: a.avatar_url ?? "",
                bio,
                experience_years: experienceYears,
                specialties,
                languages,
              }}
            />
          )}
          <UserActions user={a} />
        </div>
      </div>

      {/* Танилцуулга */}
      {(hasProfileInfo || canEdit) && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 text-sm mb-3">Танилцуулга</h2>
          {hasProfileInfo ? (
            <div className="space-y-4">
              {bio && (
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{bio}</p>
              )}
              {(specialties.length > 0 || languages.length > 0) && (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  {specialties.length > 0 && (
                    <div>
                      <dt className="text-xs text-gray-500 mb-1.5">Мэргэшил</dt>
                      <dd className="flex flex-wrap gap-1.5">
                        {specialties.map((s) => (
                          <span key={s} className="inline-flex items-center bg-indigo-50 text-indigo-700 text-xs font-medium px-2 py-1 rounded-md">
                            {s}
                          </span>
                        ))}
                      </dd>
                    </div>
                  )}
                  {languages.length > 0 && (
                    <div>
                      <dt className="text-xs text-gray-500 mb-1.5">Ярьдаг хэл</dt>
                      <dd className="flex flex-wrap gap-1.5">
                        {languages.map((l) => (
                          <span key={l} className="inline-flex items-center bg-gray-100 text-gray-700 text-xs font-medium px-2 py-1 rounded-md">
                            {l}
                          </span>
                        ))}
                      </dd>
                    </div>
                  )}
                </dl>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              Танилцуулга оруулаагүй байна. Дээрх <span className="font-medium text-indigo-600">"Профайл засах"</span> товчоор танилцуулга, мэргэшил, ярьдаг хэлээ нэмнэ үү.
            </p>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Нийт зар" value={totalListings.count ?? 0} sub={`${activeListings.count ?? 0} идэвхтэй`} />
        <Stat label="Зарагдсан" value={soldListings.count ?? 0} />
        <Stat label="Хүсэлт" value={totalInquiries.count ?? 0} sub={`${newInquiries.count ?? 0} шинэ`} />
        <Stat label="Конверс" value={`${conversionRate}%`} sub={`${wonInquiries.count ?? 0} амжилттай`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Сүүлийн зарууд */}
        <div className="bg-white rounded-2xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">Сүүлийн зарууд</h2>
            <Link
              href={`/dashboard/listings?agent=${id}`}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              Бүгд →
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {(recentListings.data ?? []).map((l) => {
              const r = l as { id: string; title: string; price: number; status: string; district: string | null; created_at: string };
              return (
                <Link
                  key={r.id}
                  href={`/dashboard/listings/${r.id}`}
                  className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      ₮{fmtPrice(r.price)}{r.district ? ` · ${r.district}` : ""}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 ${
                    STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-600"
                  }`}>
                    {STATUS_LABELS[r.status] ?? r.status}
                  </span>
                </Link>
              );
            })}
            {(recentListings.data ?? []).length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-gray-400">Зар байхгүй</p>
            )}
          </div>
        </div>

        {/* Сүүлийн хүсэлтүүд */}
        <div className="bg-white rounded-2xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">Сүүлийн хүсэлтүүд</h2>
            <Link
              href={`/dashboard/inquiries?agent=${id}`}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              Бүгд →
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {(recentInquiries.data ?? []).map((inq) => {
              const r = inq as {
                id: string; status: string; message: string | null; created_at: string;
                listing: { id: string; title: string } | null;
                buyer: { full_name: string | null; email: string } | null;
              };
              return (
                <div key={r.id} className="px-5 py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={r.listing?.id ? `/dashboard/listings/${r.listing.id}` : "#"}
                        className="text-sm font-medium text-gray-900 hover:text-indigo-600 truncate"
                      >
                        {r.listing?.title ?? "—"}
                      </Link>
                      <InquiryStatusBadge status={r.status} />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {r.buyer?.full_name || r.buyer?.email || "—"}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(r.created_at)}</span>
                </div>
              );
            })}
            {(recentInquiries.data ?? []).length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-gray-400">Хүсэлт байхгүй</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}
