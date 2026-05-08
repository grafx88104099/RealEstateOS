import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin as typedAdmin } from "@/lib/supabase/admin";
import { StatCard } from "@/components/ui/stat-card";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAdmin = typedAdmin as unknown as SupabaseClient<any, any, any>;

export const dynamic = "force-dynamic";

async function counts() {
  const [active, pending, rejected, featured, today, deleted] = await Promise.all([
    supabaseAdmin.from("listings").select("id", { count: "exact", head: true }).eq("status", "active").is("deleted_at", null),
    supabaseAdmin.from("listings").select("id", { count: "exact", head: true }).eq("status", "pending_review").is("deleted_at", null),
    supabaseAdmin.from("listings").select("id", { count: "exact", head: true }).eq("status", "rejected").is("deleted_at", null),
    supabaseAdmin.from("listings").select("id", { count: "exact", head: true }).eq("featured", true).is("deleted_at", null),
    supabaseAdmin.from("listings").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString()).is("deleted_at", null),
    supabaseAdmin.from("listings").select("id", { count: "exact", head: true }).not("deleted_at", "is", null),
  ]);
  return {
    active: active.count ?? 0,
    pending: pending.count ?? 0,
    rejected: rejected.count ?? 0,
    featured: featured.count ?? 0,
    today: today.count ?? 0,
    deleted: deleted.count ?? 0,
  };
}

export default async function PublicListingsHubPage() {
  const c = await counts();
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Нийтийн зарууд</h1>
        <p className="text-sm text-gray-500 mt-1">
          Flutter app болон вебэд харагдаж буй зарын хяналт.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        <StatCard label="Идэвхтэй" value={c.active} />
        <StatCard label="Хяналтад" value={c.pending} />
        <StatCard label="Татгалзсан" value={c.rejected} />
        <StatCard label="Онцлох" value={c.featured} />
        <StatCard label="Өнөөдөр" value={c.today} />
        <StatCard label="Архив" value={c.deleted} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/super/public-listings/queue"
          className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
        >
          <h3 className="font-semibold text-gray-900">Хяналтын дараалал</h3>
          <p className="text-sm text-gray-500 mt-1">
            Pending review-д буй зарууд. Зөвшөөрөх, татгалзах, устгах.
          </p>
          {c.pending > 0 && (
            <span className="inline-flex mt-2 px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
              {c.pending} хүлээгдэж буй
            </span>
          )}
        </Link>
        <Link
          href="/super/public-listings/all"
          className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
        >
          <h3 className="font-semibold text-gray-900">Бүх зар</h3>
          <p className="text-sm text-gray-500 mt-1">
            Бүх агентлагийн зар, шүүлтүүртэй жагсаалт.
          </p>
        </Link>
        <div className="bg-white rounded-xl border border-gray-200 border-dashed p-5">
          <h3 className="font-semibold text-gray-400">Онцлох зар (Phase B)</h3>
          <p className="text-sm text-gray-400 mt-1">
            Featured carousel удирдлага удахгүй нэмэгдэнэ.
          </p>
        </div>
      </div>
    </div>
  );
}
