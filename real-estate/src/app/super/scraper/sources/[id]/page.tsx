import Link from "next/link";
import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin as typedAdmin } from "@/lib/supabase/admin";
import { TestScanButton } from "@/components/super/scraper/test-scan-button";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAdmin = typedAdmin as unknown as SupabaseClient<any, any, any>;

export const dynamic = "force-dynamic";

export default async function SourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data } = await supabaseAdmin
    .from("scraper_sources")
    .select(
      `id, name, base_url, enabled, cron_schedule, auto_promote,
       confidence_threshold, spam_threshold, last_scraped_at, total_scraped,
       target_tenant_id, tenant_id`,
    )
    .eq("id", id)
    .single();

  type S = {
    id: string;
    name: string;
    base_url: string;
    enabled: boolean;
    cron_schedule: string | null;
    auto_promote: boolean;
    confidence_threshold: number | null;
    spam_threshold: number | null;
    last_scraped_at: string | null;
    total_scraped: number | null;
    target_tenant_id: string | null;
    tenant_id: string;
  };
  const source = data as S | null;
  if (!source) notFound();

  const { data: jobs } = await supabaseAdmin
    .from("scraper_jobs")
    .select("id, mode, status, scheduled_at, started_at, finished_at, last_error, run_id")
    .eq("source_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: scraped } = await supabaseAdmin
    .from("scraped_listings")
    .select(
      "id, title, price, district, status, ai_confidence, promotion_blocker, created_at, images, source_url",
    )
    .eq("source_site", "unegui.mn") // Phase A only one site
    .order("created_at", { ascending: false })
    .limit(20);

  type Job = {
    id: string;
    mode: string;
    status: string;
    scheduled_at: string;
    started_at: string | null;
    finished_at: string | null;
    last_error: string | null;
    run_id: string | null;
  };
  type Sc = {
    id: string;
    title: string | null;
    price: number | null;
    district: string | null;
    status: string;
    ai_confidence: number | null;
    promotion_blocker: string | null;
    created_at: string;
    images: string[] | null;
    source_url: string | null;
  };
  const jobRows = (jobs as Job[] | null) ?? [];
  const scrapedRows = (scraped as Sc[] | null) ?? [];

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/super/scraper/sources"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Бүх sources
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900">{source.name}</h1>
      <p className="text-sm text-gray-500 mt-1">{source.base_url}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-xs font-medium uppercase text-gray-500 mb-2">
            Тохиргоо
          </h3>
          <dl className="space-y-1.5 text-sm">
            <Field label="Cron schedule" value={source.cron_schedule ?? "—"} />
            <Field label="Confidence threshold" value={source.confidence_threshold?.toString() ?? "—"} />
            <Field label="Spam threshold" value={source.spam_threshold?.toString() ?? "—"} />
            <Field label="Auto-promote" value={source.auto_promote ? "Тийм" : "Үгүй"} />
            <Field label="Enabled" value={source.enabled ? "Тийм" : "Үгүй"} />
          </dl>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-xs font-medium uppercase text-gray-500 mb-2">
            Идэвх
          </h3>
          <dl className="space-y-1.5 text-sm">
            <Field
              label="Сүүлд скан"
              value={
                source.last_scraped_at
                  ? new Date(source.last_scraped_at).toLocaleString("mn-MN")
                  : "хэзээ ч"
              }
            />
            <Field label="Нийт scrape" value={(source.total_scraped ?? 0).toString()} />
          </dl>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-xs font-medium uppercase text-gray-500 mb-2">Тест</h3>
          <p className="text-xs text-gray-500 mb-3">
            Quick mode-аар яг одоо нэг скан явуулна. ~30-60 секунд.
          </p>
          <TestScanButton sourceId={source.id} />
        </div>
      </div>

      {/* Recent jobs */}
      <h2 className="mt-8 mb-3 font-semibold text-gray-900">Сүүлийн ажилбарууд</h2>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="text-left px-4 py-3">Mode</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Эхэлсэн</th>
              <th className="text-left px-4 py-3">Дууссан</th>
              <th className="text-left px-4 py-3">Алдаа</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {jobRows.map((j) => (
              <tr key={j.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{j.mode}</td>
                <td className="px-4 py-2">
                  <StatusPill status={j.status} />
                </td>
                <td className="px-4 py-2 text-xs text-gray-500">
                  {j.started_at ? new Date(j.started_at).toLocaleString("mn-MN") : "—"}
                </td>
                <td className="px-4 py-2 text-xs text-gray-500">
                  {j.finished_at ? new Date(j.finished_at).toLocaleString("mn-MN") : "—"}
                </td>
                <td className="px-4 py-2 text-xs text-red-600 truncate max-w-xs">
                  {j.last_error ?? ""}
                </td>
              </tr>
            ))}
            {jobRows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Ажилбар байхгүй
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Recent scraped */}
      <h2 className="mt-8 mb-3 font-semibold text-gray-900">Сүүлийн scrape хийсэн зарууд</h2>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="text-left px-4 py-3">Зураг</th>
              <th className="text-left px-4 py-3">Гарчиг</th>
              <th className="text-right px-4 py-3">Үнэ</th>
              <th className="text-left px-4 py-3">Дүүрэг</th>
              <th className="text-left px-4 py-3">Confidence</th>
              <th className="text-left px-4 py-3">Status / Blocker</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {scrapedRows.map((r) => {
              const cover = r.images?.[0];
              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cover}
                        alt=""
                        className="w-12 h-12 object-cover rounded-lg bg-gray-100"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-100" />
                    )}
                  </td>
                  <td className="px-4 py-2 max-w-xs">
                    {r.source_url ? (
                      <a
                        href={r.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gray-900 hover:text-indigo-600 truncate block"
                      >
                        {r.title ?? "—"}
                      </a>
                    ) : (
                      <span className="truncate">{r.title ?? "—"}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {r.price != null ? `₮${r.price.toLocaleString("mn-MN")}` : "—"}
                  </td>
                  <td className="px-4 py-2">{r.district ?? "—"}</td>
                  <td className="px-4 py-2">
                    {r.ai_confidence != null
                      ? `${Math.round(r.ai_confidence * 100)}%`
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    <StatusPill status={r.status} />
                    {r.promotion_blocker && (
                      <span className="ml-2 text-red-600 italic">{r.promotion_blocker}</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {scrapedRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Scrape хийгдсэн зар алга
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-900">{value}</dd>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const c: Record<string, string> = {
    queued: "bg-gray-100 text-gray-700",
    running: "bg-blue-100 text-blue-700",
    succeeded: "bg-emerald-100 text-emerald-700",
    failed: "bg-red-100 text-red-700",
    cancelled: "bg-gray-200 text-gray-600",
    pending_review: "bg-yellow-100 text-yellow-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
    stale: "bg-gray-200 text-gray-600",
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
