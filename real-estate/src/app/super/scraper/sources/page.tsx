import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin as typedAdmin } from "@/lib/supabase/admin";
import { SourceToggles } from "@/components/super/scraper/source-toggles";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAdmin = typedAdmin as unknown as SupabaseClient<any, any, any>;

export const dynamic = "force-dynamic";

type Source = {
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
  tenant: { id: string; name: string } | null;
};

export default async function ScraperSourcesPage() {
  const { data } = await supabaseAdmin
    .from("scraper_sources")
    .select(
      `id, name, base_url, enabled, cron_schedule, auto_promote,
       confidence_threshold, spam_threshold, last_scraped_at, total_scraped,
       tenant:tenants(id, name)`,
    )
    .order("created_at", { ascending: false });

  const sources = (data as Source[] | null) ?? [];

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sources</h1>
          <p className="text-sm text-gray-500 mt-1">
            {sources.length} source · cron давтамж, threshold, auto-promote
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
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium uppercase text-gray-500">Нэр</th>
              <th className="text-left px-4 py-3 text-xs font-medium uppercase text-gray-500">Tenant</th>
              <th className="text-left px-4 py-3 text-xs font-medium uppercase text-gray-500">Cron</th>
              <th className="text-left px-4 py-3 text-xs font-medium uppercase text-gray-500">Сүүлд</th>
              <th className="text-right px-4 py-3 text-xs font-medium uppercase text-gray-500">Нийт</th>
              <th className="text-left px-4 py-3 text-xs font-medium uppercase text-gray-500">
                Enabled / Auto
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium uppercase text-gray-500"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sources.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/super/scraper/sources/${s.id}`}
                    className="font-medium text-gray-900 hover:text-indigo-600"
                  >
                    {s.name}
                  </Link>
                  <div className="text-xs text-gray-500 truncate max-w-xs">
                    {s.base_url}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-700">{s.tenant?.name ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-600">
                  {s.cron_schedule ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {s.last_scraped_at
                    ? new Date(s.last_scraped_at).toLocaleString("mn-MN")
                    : "хэзээ ч "}
                </td>
                <td className="px-4 py-3 text-right text-gray-700">
                  {s.total_scraped ?? 0}
                </td>
                <td className="px-4 py-3">
                  <SourceToggles
                    id={s.id}
                    initialEnabled={s.enabled}
                    initialAutoPromote={s.auto_promote}
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/super/scraper/sources/${s.id}`}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    Дэлгэрэнгүй →
                  </Link>
                </td>
              </tr>
            ))}
            {sources.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                  Source тохируулаагүй байна.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-gray-500 leading-relaxed">
        <strong>Toggle тайлбар:</strong> ногоон — source идэвхтэй (cron-аас явагдана). Indigo —
        auto-promote (Phase B-д идэвхжих); одоохондоо бүх promote зар нь pending_review хэлбэрээр
        super admin-д ирнэ.
      </p>
    </div>
  );
}
