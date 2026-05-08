import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin as typedAdmin } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAdmin = typedAdmin as unknown as SupabaseClient<any, any, any>;

export const dynamic = "force-dynamic";

type Run = {
  id: string;
  status: string;
  pages_scraped: number;
  listings_found: number;
  listings_new: number;
  listings_updated: number;
  errors: string[] | null;
  started_at: string;
  finished_at: string | null;
  token_usage: { total_usd_cents?: number } | null;
};

export default async function RunsPage() {
  const { data } = await supabaseAdmin
    .from("scraper_runs")
    .select(
      "id, status, pages_scraped, listings_found, listings_new, listings_updated, errors, started_at, finished_at, token_usage",
    )
    .order("started_at", { ascending: false })
    .limit(100);

  const runs = (data as Run[] | null) ?? [];

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scraper runs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Сүүлийн 100 скан + token cost
          </p>
        </div>
        <Link
          href="/super/scraper"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Буцах
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="text-left px-4 py-3">Эхэлсэн</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Pages</th>
              <th className="text-right px-4 py-3">Found</th>
              <th className="text-right px-4 py-3">New</th>
              <th className="text-right px-4 py-3">Updated</th>
              <th className="text-right px-4 py-3">Cost</th>
              <th className="text-left px-4 py-3">Errors</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {runs.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-xs text-gray-700">
                  {new Date(r.started_at).toLocaleString("mn-MN")}
                </td>
                <td className="px-4 py-2">
                  <Pill status={r.status} />
                </td>
                <td className="px-4 py-2 text-right">{r.pages_scraped}</td>
                <td className="px-4 py-2 text-right">{r.listings_found}</td>
                <td className="px-4 py-2 text-right font-medium text-emerald-700">
                  {r.listings_new}
                </td>
                <td className="px-4 py-2 text-right">{r.listings_updated}</td>
                <td className="px-4 py-2 text-right text-xs text-gray-700">
                  ${((r.token_usage?.total_usd_cents ?? 0) / 100).toFixed(4)}
                </td>
                <td className="px-4 py-2 text-xs text-red-600 truncate max-w-xs">
                  {r.errors?.length ? r.errors[0] : ""}
                </td>
              </tr>
            ))}
            {runs.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                  Run алга
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Pill({ status }: { status: string }) {
  const c: Record<string, string> = {
    completed: "bg-emerald-100 text-emerald-700",
    running: "bg-blue-100 text-blue-700",
    failed: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
        c[status] ?? "bg-gray-100 text-gray-700"
      }`}
    >
      {status}
    </span>
  );
}
