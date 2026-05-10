import Link from "next/link";
import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin as typedAdmin } from "@/lib/supabase/admin";
import { ReviewToggle } from "@/components/super/public-listings/review-toggle";
import TenantActions from "./tenant-actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAdmin = typedAdmin as unknown as SupabaseClient<any, any, any>;

export const dynamic = "force-dynamic";

function fmtPrice(p: number) {
  if (p >= 1_000_000_000) return `${(p / 1_000_000_000).toFixed(1)} тэрбум`;
  if (p >= 1_000_000) return `${Math.round(p / 1_000_000)} сая`;
  return p.toLocaleString();
}

export default async function SuperTenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("id, name, slug, subscription, is_active, requires_listing_review, logo_url, settings, created_at")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!tenant) notFound();

  const settings = (tenant.settings ?? {}) as Record<string, string | undefined>;

  const [agentsRes, listingsRes, inquiriesRes, soldRes, recentListings, admins] = await Promise.all([
    supabaseAdmin.from("users").select("id", { count: "exact", head: true })
      .eq("tenant_id", id).eq("role", "agent").is("deleted_at", null),
    supabaseAdmin.from("listings").select("id", { count: "exact", head: true })
      .eq("tenant_id", id).is("deleted_at", null),
    supabaseAdmin.from("inquiries").select("id", { count: "exact", head: true })
      .eq("tenant_id", id).is("deleted_at", null),
    supabaseAdmin.from("listings").select("id", { count: "exact", head: true })
      .eq("tenant_id", id).eq("status", "sold").is("deleted_at", null),
    supabaseAdmin.from("listings")
      .select("id, title, price, status, district, created_at")
      .eq("tenant_id", id).is("deleted_at", null)
      .order("created_at", { ascending: false }).limit(5),
    supabaseAdmin.from("users")
      .select("id, full_name, email, avatar_url, is_active")
      .eq("tenant_id", id).eq("role", "tenant_admin").is("deleted_at", null),
  ]);

  return (
    <div className="p-8 max-w-screen-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/super/tenants"
          aria-label="Буцах"
          className="flex-shrink-0 w-9 h-9 rounded-full bg-white border border-gray-200 hover:bg-gray-100 flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">{tenant.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5 font-mono truncate">{tenant.slug}</p>
        </div>
      </div>

      {/* Тойм карт */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start gap-5">
          <div className="flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-100 to-violet-100 ring-2 ring-white shadow-sm flex items-center justify-center text-indigo-400">
            {tenant.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tenant.logo_url} alt={tenant.name} className="w-full h-full object-cover" />
            ) : (
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V20a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1V9.75z" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                tenant.is_active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
              }`}>
                {tenant.is_active ? "Идэвхтэй" : "Хаагдсан"}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                tenant.subscription === "pro" ? "bg-purple-50 text-purple-700"
                : tenant.subscription === "enterprise" ? "bg-blue-50 text-blue-700"
                : "bg-gray-100 text-gray-600"
              }`}>
                {tenant.subscription}
              </span>
              <span className="text-xs text-gray-500">
                Бүртгэлтэй: {new Date(tenant.created_at).toLocaleDateString("mn-MN")}
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <dt className="text-xs text-gray-500">Утас</dt>
                <dd className="text-gray-900">{settings.phone || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Хаяг</dt>
                <dd className="text-gray-900 truncate">{settings.address || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Эзэмшигчид</dt>
                <dd className="text-gray-900">{admins.data?.length ?? 0}</dd>
              </div>
            </dl>
            {settings.bio && (
              <p className="text-sm text-gray-600 mt-3 leading-relaxed">{settings.bio}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Агент" value={agentsRes.count ?? 0} link={`/super/agents?tenant=${id}`} />
        <Stat label="Зар" value={listingsRes.count ?? 0} link={`/super/public-listings/all?tenant=${id}`} />
        <Stat label="Хүсэлт" value={inquiriesRes.count ?? 0} />
        <Stat label="Зарагдсан" value={soldRes.count ?? 0} />
      </div>

      {/* Удирдлагын самбар */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 text-sm mb-4">Удирдлага</h2>
        <TenantActions
          id={id}
          name={tenant.name}
          isActive={tenant.is_active}
          subscription={tenant.subscription}
        />
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Зар хяналт</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {tenant.requires_listing_review
                ? "Шинэ зар бүрд super admin зөвшөөрөл шаарддаг"
                : "Зар нэмэхэд хязгаарлалт байхгүй"}
            </p>
          </div>
          <ReviewToggle tenantId={id} initial={tenant.requires_listing_review} />
        </div>
      </div>

      {/* Эзэмшигч (tenant_admin) */}
      {(admins.data ?? []).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 mb-6">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">Эзэмшигчид</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {(admins.data ?? []).map((a) => {
              const u = a as { id: string; full_name: string | null; email: string; avatar_url: string | null; is_active: boolean };
              return (
                <div key={u.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-indigo-100 flex-shrink-0">
                    {u.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{u.full_name || "—"}</p>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  </div>
                  {!u.is_active && (
                    <span className="text-xs text-rose-700 bg-rose-50 px-2 py-0.5 rounded">Хаагдсан</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Сүүлийн зарууд */}
      <div className="bg-white rounded-2xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-sm">Сүүлийн зарууд</h2>
          <Link
            href={`/super/public-listings/all?tenant=${id}`}
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
                href={`/super/public-listings/${r.id}`}
                className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    ₮{fmtPrice(r.price)}{r.district ? ` · ${r.district}` : ""}
                  </p>
                </div>
                <span className="text-xs text-gray-500 flex-shrink-0 ml-3">{r.status}</span>
              </Link>
            );
          })}
          {(recentListings.data ?? []).length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-gray-400">Зар байхгүй</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, link }: { label: string; value: number; link?: string }) {
  const inner = (
    <>
      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{value}</p>
    </>
  );
  if (link) {
    return (
      <Link
        href={link}
        className="block bg-white rounded-2xl border border-gray-200 p-4 hover:border-indigo-200 hover:shadow-sm transition-all"
      >
        {inner}
      </Link>
    );
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      {inner}
    </div>
  );
}
