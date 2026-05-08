import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin as typedAdmin } from "@/lib/supabase/admin";
import { StatCard } from "@/components/ui/stat-card";
import Link from "next/link";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAdmin = typedAdmin as unknown as SupabaseClient<any, any, any>;

export const dynamic = "force-dynamic";

export default async function SuperAdminHomePage() {
  const [tenants, listings, users, inquiries, pendingListings, activeListings, featuredListings] =
    await Promise.all([
      supabaseAdmin.from("tenants").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("listings").select("id", { count: "exact", head: true }).is("deleted_at", null),
      supabaseAdmin.from("users").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("inquiries").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending_review")
        .is("deleted_at", null),
      supabaseAdmin
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .is("deleted_at", null),
      supabaseAdmin
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("featured", true)
        .is("deleted_at", null),
    ]);

  const pendingCount = pendingListings.count ?? 0;

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Super Admin</h1>
        <p className="text-sm text-gray-500 mt-1">
          Системийн ерөнхий хяналтын самбар
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Агентлаг" value={tenants.count ?? 0} />
        <StatCard label="Нийт зар" value={listings.count ?? 0} />
        <StatCard label="Нийт хэрэглэгч" value={users.count ?? 0} />
        <StatCard label="Нийт хүсэлт" value={inquiries.count ?? 0} />
      </div>

      {/* ── Flutter app зарын удирдлага ──────────────────────────── */}
      <section className="mb-8">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <svg
                className="w-4 h-4 text-indigo-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="6" y="3" width="12" height="18" rx="2" />
                <path d="M11 18h2" />
              </svg>
              Flutter app — Нийтийн зарууд
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Гар утасны хэрэглэгч болон вебэд харагдаж буй зарын хяналт
            </p>
          </div>
          {pendingCount > 0 && (
            <Link
              href="/super/public-listings/queue"
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-yellow-100 text-yellow-700 px-2.5 py-1.5 rounded-full hover:bg-yellow-200 transition-colors"
            >
              <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full animate-pulse" />
              {pendingCount} хүлээгдэж буй
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/super/public-listings/queue"
            className="group relative bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-yellow-300 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-lg bg-yellow-100 text-yellow-700 flex items-center justify-center mb-3">
                <svg
                  className="w-4.5 h-4.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">{pendingCount}</span>
            </div>
            <h3 className="font-semibold text-gray-900">Хяналтын дараалал</h3>
            <p className="text-sm text-gray-500 mt-1">
              Pending зар → зөвшөөрөх / татгалзах
            </p>
          </Link>

          <Link
            href="/super/public-listings/all"
            className="group relative bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-emerald-300 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                <svg
                  className="w-4.5 h-4.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 9.75L12 3l9 6.75V20a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1V9.75z"
                  />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">
                {activeListings.count ?? 0}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900">Идэвхтэй зарууд</h3>
            <p className="text-sm text-gray-500 mt-1">
              Бүх агентлагийн зар — шүүлт, статус, устгал
            </p>
          </Link>

          <Link
            href="/super/public-listings"
            className="group relative bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-amber-300 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
                <svg
                  className="w-4.5 h-4.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10 2L8 6 4 7l3 3-1 5 4-2 4 2-1-5 3-3-4-1z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">
                {featuredListings.count ?? 0}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900">Онцлох зарууд</h3>
            <p className="text-sm text-gray-500 mt-1">
              Flutter Home carousel-д харагдах зарын удирдлага
            </p>
          </Link>
        </div>

        {/* AI Scraper тусдаа карт */}
        <div className="mt-4">
          <Link
            href="/super/scraper"
            className="group relative block bg-gradient-to-br from-indigo-50 via-violet-50 to-white rounded-xl border border-indigo-200 p-5 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-sm">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2L8 6 4 7l3 3-1 5 4-2 4 2-1-5 3-3-4-1z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">
                  AI Listing Discovery
                </h3>
                <p className="text-sm text-gray-600 mt-0.5">
                  Интернетээс зар автоматаар хайх агент — sources, runs, тохиргоо
                </p>
              </div>
              <svg
                className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </Link>
        </div>
      </section>

      {/* ── Бусад модулууд ───────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          Бусад модул
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/super/tenants"
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-gray-900">Агентлагууд</h3>
            <p className="text-sm text-gray-500 mt-1">
              Бүх агентлагийн жагсаалт, идэвхжүүлэх/хаах, хяналт идэвхжүүлэх
            </p>
          </Link>
          <Link
            href="/super/users"
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-gray-900">Хэрэглэгчид</h3>
            <p className="text-sm text-gray-500 mt-1">
              Бүх хэрэглэгчийн жагсаалт, role шүүлт
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
