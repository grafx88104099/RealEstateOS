import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin as typedAdmin } from "@/lib/supabase/admin";
import { StatCard } from "@/components/ui/stat-card";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAdmin = typedAdmin as unknown as SupabaseClient<any, any, any>;

export const dynamic = "force-dynamic";

const oneDayAgo = () => new Date(Date.now() - 24 * 3600 * 1000).toISOString();

export default async function ScraperOverviewPage() {
  const since = oneDayAgo();

  const [runs, scraped, autoPromoted, blocked, sources] = await Promise.all([
    supabaseAdmin
      .from("scraper_runs")
      .select("id, listings_new, token_usage", { count: "exact" })
      .gte("started_at", since),
    supabaseAdmin
      .from("scraped_listings")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since),
    supabaseAdmin
      .from("scraped_listings")
      .select("id", { count: "exact", head: true })
      .gte("auto_promoted_at", since),
    supabaseAdmin
      .from("scraped_listings")
      .select("id, promotion_blocker", { count: "exact" })
      .gte("created_at", since)
      .not("promotion_blocker", "is", null),
    supabaseAdmin
      .from("scraper_sources")
      .select("id, name, enabled, base_url", { count: "exact" }),
  ]);

  type Run = {
    id: string;
    listings_new: number;
    token_usage: { total_usd_cents?: number } | null;
  };
  const runRows = (runs.data as Run[] | null) ?? [];
  const totalCents = runRows.reduce(
    (acc, r) => acc + (r.token_usage?.total_usd_cents ?? 0),
    0,
  );
  const totalNewListings = runRows.reduce((acc, r) => acc + (r.listings_new ?? 0), 0);

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2L8 6 4 7l3 3-1 5 4-2 4 2-1-5 3-3-4-1z" />
              </svg>
            </span>
            AI Listing Discovery
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Интернетээс зар автоматаар хайж pending_review-руу нийтэлдэг агент
          </p>
        </div>
        <Link
          href="/super/scraper/sources"
          className="text-sm font-medium px-3 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800"
        >
          Sources →
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="24h scans" value={runs.count ?? 0} />
        <StatCard label="Шинэ scrape" value={scraped.count ?? 0} />
        <StatCard label="Промоут" value={autoPromoted.count ?? 0} />
        <StatCard label="Блок" value={blocked.count ?? 0} />
        <StatCard
          label="Зардал ($24h)"
          value={`$${(totalCents / 100).toFixed(4)}`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link
          href="/super/scraper/sources"
          className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
        >
          <h3 className="font-semibold text-gray-900">Sources</h3>
          <p className="text-sm text-gray-500 mt-1">
            {sources.count ?? 0} тохируулсан, идэвхтэй / cron / threshold
          </p>
        </Link>
        <Link
          href="/super/scraper/runs"
          className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
        >
          <h3 className="font-semibold text-gray-900">Runs</h3>
          <p className="text-sm text-gray-500 mt-1">
            Сүүлийн скануудын лог + token cost
          </p>
        </Link>
        <Link
          href="/super/public-listings/queue"
          className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
        >
          <h3 className="font-semibold text-gray-900">Хяналтын дараалал</h3>
          <p className="text-sm text-gray-500 mt-1">
            Scraper-аас орж ирсэн pending зар → approve / reject
          </p>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Сүүлийн 24h тойм</h3>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <Stat label="Найдвартай sources" value={sources.count ?? 0} />
          <Stat label="Тэмдэглэсэн зар" value={totalNewListings} />
          <Stat label="Pending → Promoted" value={autoPromoted.count ?? 0} />
          <Stat label="Blocked" value={blocked.count ?? 0} />
        </dl>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-lg font-semibold text-gray-900">{value}</dd>
    </div>
  );
}
