"use client";

import { useState } from "react";
import { safeFormatLine } from "@/lib/utils/safe-markdown";

interface DistrictStat {
  name: string;
  count: number;
  avg_price: number;
  sold: number;
  inquiries: number;
}

interface AnalysisResult {
  analysis: string;
  stats: {
    active_count: number;
    sold_count: number;
    inquiry_count: number;
    min_price: number;
    max_price: number;
    median_price: number;
    districts: DistrictStat[];
  };
  generated_at: string;
}

function formatPrice(p: number) {
  if (p >= 1_000_000_000) return `${(p / 1_000_000_000).toFixed(1)} тэрбум`;
  if (p >= 1_000_000) return `${(p / 1_000_000).toFixed(0)} сая`;
  return p.toLocaleString();
}

export function MarketAnalysisClient() {
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/market-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) setData(await res.json());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  if (!data) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-purple-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">AI Зах зээлийн шинжилгээ</h2>
        <p className="text-sm text-gray-500 mb-6">Таны зарууд, хүсэлтийн мэдээлэлд тулгуурлан AI зах зээлийн дүн шинжилгээ хийнэ</p>
        <button onClick={generate} disabled={loading}
          className="inline-flex items-center gap-2 bg-purple-600 text-white text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors">
          {loading ? (
            <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Шинжилж байна...</>
          ) : (
            <><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>Шинжилгээ эхлүүлэх</>
          )}
        </button>
      </div>
    );
  }

  const { stats, analysis } = data;
  const maxCount = Math.max(...stats.districts.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400">Идэвхтэй зар</p>
          <p className="text-2xl font-bold text-gray-900">{stats.active_count}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400">Зарагдсан</p>
          <p className="text-2xl font-bold text-green-600">{stats.sold_count}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400">Хүсэлт</p>
          <p className="text-2xl font-bold text-blue-600">{stats.inquiry_count}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400">Медиан үнэ</p>
          <p className="text-2xl font-bold text-gray-900">{formatPrice(stats.median_price)}₮</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400">Үнийн хүрээ</p>
          <p className="text-sm font-medium text-gray-900">{formatPrice(stats.min_price)}₮ — {formatPrice(stats.max_price)}₮</p>
        </div>
      </div>

      {/* District Chart */}
      {stats.districts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 text-sm mb-4">Дүүрэг бүрийн тойм</h2>
          <div className="space-y-3">
            {stats.districts.slice(0, 10).map((d) => (
              <div key={d.name} className="flex items-center gap-3">
                <span className="text-xs font-medium text-gray-700 w-10 shrink-0">{d.name}</span>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${Math.max((d.count / maxCount) * 100, 8)}%` }}
                    >
                      <span className="text-xs text-white font-medium">{d.count}</span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 w-16 text-right">{formatPrice(d.avg_price)}₮</span>
                  <span className="text-xs text-green-600 w-8 text-right">{d.sold}</span>
                  <span className="text-xs text-blue-500 w-8 text-right">{d.inquiries}</span>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-3 pt-2 border-t border-gray-100 text-xs text-gray-400">
              <span className="w-10" />
              <div className="flex-1 flex items-center gap-2">
                <span className="flex-1">Зарын тоо</span>
                <span className="w-16 text-right">Дундаж үнэ</span>
                <span className="w-8 text-right text-green-600">Зарагд</span>
                <span className="w-8 text-right text-blue-500">Хүсэлт</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Analysis */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <h2 className="font-semibold text-gray-900 text-sm">AI Шинжилгээ</h2>
          </div>
          <button onClick={generate} disabled={loading}
            className="text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50">
            {loading ? "Шинжилж байна..." : "Дахин шинжлэх"}
          </button>
        </div>
        <div className="px-6 py-4 text-sm text-gray-700 leading-relaxed">
          {analysis.split("\n").map((line, i) => {
            if (!line.trim()) return <br key={i} />;
            const formatted = safeFormatLine(line);
            if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
              return (
                <div key={i} className="flex gap-2 ml-2 my-0.5">
                  <span className="text-purple-400 shrink-0">-</span>
                  <span dangerouslySetInnerHTML={{ __html: safeFormatLine(line.replace(/^[\s-*]+/, "")) }} />
                </div>
              );
            }
            if (line.trim().startsWith("#")) {
              return <p key={i} className="font-semibold text-gray-900 mt-3 mb-1" dangerouslySetInnerHTML={{ __html: safeFormatLine(line.replace(/^#+\s*/, "")) }} />;
            }
            return <p key={i} dangerouslySetInnerHTML={{ __html: formatted }} />;
          })}
        </div>
      </div>
    </div>
  );
}
