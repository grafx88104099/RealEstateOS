import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin as typedAdmin } from "@/lib/supabase/admin";
import { ReviewToggle } from "@/components/super/public-listings/review-toggle";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAdmin = typedAdmin as unknown as SupabaseClient<any, any, any>;

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  pending_email: "Имэйл хүлээж буй",
  pending_approval: "Зөвшөөрөл хүлээж буй",
  active: "Идэвхтэй",
  rejected: "Татгалзсан",
  suspended: "Түр хаагдсан",
};

const STATUS_COLORS: Record<string, string> = {
  pending_email: "bg-gray-100 text-gray-600",
  pending_approval: "bg-amber-50 text-amber-700",
  active: "bg-emerald-50 text-emerald-700",
  rejected: "bg-rose-50 text-rose-700",
  suspended: "bg-orange-50 text-orange-700",
};

const FILTER_OPTIONS = [
  { key: "all", label: "Бүгд" },
  { key: "pending_approval", label: "Хүлээгдэж буй" },
  { key: "active", label: "Идэвхтэй" },
  { key: "rejected", label: "Татгалзсан" },
  { key: "suspended", label: "Түр хаагдсан" },
];

export default async function SuperTenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const filter = sp.status ?? "all";

  let query = supabaseAdmin
    .from("tenants")
    .select("id, name, slug, subscription, is_active, requires_listing_review, status, created_at")
    .is("deleted_at", null);

  if (filter !== "all") {
    query = query.eq("status", filter);
  }

  const { data: tenants } = await query.order("created_at", { ascending: false });

  // Pending тооцоо badge-нд харуулах
  const { count: pendingCount } = await supabaseAdmin
    .from("tenants")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending_approval")
    .is("deleted_at", null);

  type Tenant = {
    id: string;
    name: string;
    slug: string;
    subscription: string;
    is_active: boolean;
    requires_listing_review: boolean;
    status: string;
    created_at: string;
  };
  const rows = (tenants as Tenant[] | null) ?? [];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Оффисууд</h1>
        <p className="text-sm text-gray-500 mt-1">{rows.length} оффис</p>
      </div>

      {/* Filter tab-ууд */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTER_OPTIONS.map((opt) => {
          const isActive = filter === opt.key;
          const isPending = opt.key === "pending_approval";
          return (
            <Link
              key={opt.key}
              href={opt.key === "all" ? "/super/tenants" : `/super/tenants?status=${opt.key}`}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? "bg-indigo-600 text-white"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {opt.label}
              {isPending && (pendingCount ?? 0) > 0 && (
                <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold ${
                  isActive ? "bg-white/20 text-white" : "bg-amber-500 text-white"
                }`}>
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Нэр</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Subscription</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Огноо</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Төлөв</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Зар хяналт</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Үйлдэл</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/super/tenants/${t.id}`} className="font-medium text-gray-900 hover:text-indigo-600 transition-colors">
                    {t.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{t.slug}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    t.subscription === "pro" ? "bg-purple-50 text-purple-700"
                    : t.subscription === "enterprise" ? "bg-blue-50 text-blue-700"
                    : "bg-gray-100 text-gray-600"
                  }`}>
                    {t.subscription}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {new Date(t.created_at).toLocaleDateString("mn-MN")}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[t.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {STATUS_LABELS[t.status] ?? t.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ReviewToggle tenantId={t.id} initial={t.requires_listing_review} />
                    <span className="text-xs text-gray-500">{t.requires_listing_review ? "Заавал" : "Чөлөөт"}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/super/tenants/${t.id}`} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                    Дэлгэрэнгүй →
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  {filter === "all" ? "Оффис байхгүй байна" : "Энэ төлөвт оффис алга"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
