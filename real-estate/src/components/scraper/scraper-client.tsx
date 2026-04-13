"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ──────────────────────────────────────────────────
interface ScrapedListing {
  id: string;
  source_url: string;
  source_site: string;
  source_ext_id: string | null;
  title: string | null;
  description: string | null;
  price: number | null;
  rooms: number | null;
  area_sqm: number | null;
  floor: number | null;
  total_floors: number | null;
  district: string | null;
  property_type: string | null;
  contact_phone: string | null;
  images: string[];
  ai_confidence: number | null;
  status: string;
  created_at: string;
}

interface ScanRun {
  id: string;
  status: string;
  pages_scraped: number;
  listings_found: number;
  listings_new: number;
  listings_updated: number;
  errors: string[];
  started_at: string;
  finished_at: string | null;
}

interface SiteInfo {
  id: string;
  name: string;
  baseUrl: string;
  categories: number;
  requiresBrowser: boolean;
}

interface ScanModeInfo {
  mode: string;
  description: string;
  pagesPerCategory: number;
  intervalMinutes: number;
}

function formatPrice(p: number) {
  if (p >= 1_000_000_000) return `${(p / 1_000_000_000).toFixed(1)} тэрбум₮`;
  if (p >= 1_000_000) return `${(p / 1_000_000).toFixed(0)} сая₮`;
  return `${p.toLocaleString()}₮`;
}

function timeAgo(d: string) {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return "Саяхан";
  if (mins < 60) return `${mins} мин`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} цаг`;
  return `${Math.floor(hrs / 24)} өдөр`;
}

const STATUS_STYLES: Record<string, string> = {
  pending_review: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
  stale: "bg-gray-100 text-gray-500",
};
const STATUS_LABELS: Record<string, string> = {
  pending_review: "Хянах", approved: "Зөвшөөрсөн", rejected: "Татгалзсан", stale: "Хуучирсан",
};

// ─── Component ──────────────────────────────────────────────
export function ScraperClient() {
  const [listings, setListings] = useState<ScrapedListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("pending_review");

  // Scan state
  const [runs, setRuns] = useState<ScanRun[]>([]);
  const [sites, setSites] = useState<SiteInfo[]>([]);
  const [scanModes, setScanModes] = useState<Record<string, ScanModeInfo>>({});
  const [stats, setStats] = useState<Record<string, Record<string, number>>>({});
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  // Input
  const [inputMode, setInputMode] = useState<"url" | "text">("url");
  const [urlInput, setUrlInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<string | null>(null);

  const loadListings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/scraper?status=${tab}&limit=50`);
      if (res.ok) setListings((await res.json()).listings ?? []);
    } catch { /* */ }
    finally { setLoading(false); }
  }, [tab]);

  const loadScanInfo = useCallback(async () => {
    try {
      const res = await fetch("/api/scraper/scan?limit=10");
      if (res.ok) {
        const data = await res.json();
        setRuns(data.runs ?? []);
        setSites(data.sites ?? []);
        setScanModes(data.scanModes ?? {});
        setStats(data.stats ?? {});
      }
    } catch { /* */ }
  }, []);

  useEffect(() => { loadListings(); }, [loadListings]);
  useEffect(() => { loadScanInfo(); }, [loadScanInfo]);

  async function handleScan(site: string, mode: string) {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch("/api/scraper/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site, mode }),
      });
      const data = await res.json();
      if (res.ok) {
        setScanResult(`✅ ${data.listingsNew} шинэ, ${data.listingsUpdated} шинэчлэгдсэн (${data.pagesScraped} хуудас, ${Math.round(data.durationMs / 1000)}с)`);
        loadListings();
        loadScanInfo();
      } else {
        setScanResult(`❌ ${data.error}`);
      }
    } catch { setScanResult("❌ Холболтын алдаа"); }
    finally { setScanning(false); }
  }

  async function handleParse() {
    setParsing(true);
    setParseResult(null);
    try {
      const res = await fetch("/api/scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputMode === "url" ? { action: "parse_url", url: urlInput } : { action: "parse_text", raw_text: textInput }),
      });
      const data = await res.json();
      if (res.ok) { setParseResult("✅ Зар задлагдлаа"); setUrlInput(""); setTextInput(""); loadListings(); }
      else if (data.suggestion === "parse_text") {
        setParseResult("⚠️ Cloudflare хамгаалалттай. Текст горим руу шилжлээ — unegui.mn хуудаснаас текстийг хуулж paste хийнэ үү.");
        setInputMode("text");
      }
      else setParseResult(`❌ ${data.error}`);
    } catch { setParseResult("❌ Холболтын алдаа"); }
    finally { setParsing(false); }
  }

  async function handleAction(id: string, action: "approve" | "reject") {
    await fetch(`/api/scraper/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    loadListings();
  }

  async function handleDelete(id: string) {
    if (!confirm("Устгах уу?")) return;
    await fetch(`/api/scraper/${id}`, { method: "DELETE" });
    loadListings();
  }

  // Total stats
  const totalPending = Object.values(stats).reduce((s, v) => s + (v.pending_review ?? 0), 0);
  const totalApproved = Object.values(stats).reduce((s, v) => s + (v.approved ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* ─── Monitoring Dashboard ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400">Хянах хүлээж буй</p>
          <p className="text-2xl font-bold text-yellow-600">{totalPending}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400">Зөвшөөрөгдсөн</p>
          <p className="text-2xl font-bold text-green-600">{totalApproved}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400">Сайт тоо</p>
          <p className="text-2xl font-bold text-gray-900">{sites.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400">Сүүлийн scan</p>
          <p className="text-sm font-medium text-gray-900">{runs[0] ? timeAgo(runs[0].started_at) : "—"}</p>
        </div>
      </div>

      {/* ─── Scan Controls ─── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 text-sm mb-3">Автомат scan</h2>

        {sites.map((site) => (
          <div key={site.id} className="mb-4 last:mb-0">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-sm font-medium text-gray-900">{site.name}</span>
                <span className="text-xs text-gray-400 ml-2">{site.categories} ангилал</span>
                {site.requiresBrowser && <span className="text-xs text-amber-500 ml-2">⚠ Cloudflare</span>}
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                {Object.entries(stats[site.id] ?? {}).map(([status, count]) => (
                  <span key={status} className={`px-1.5 py-0.5 rounded ${STATUS_STYLES[status] ?? "bg-gray-100"}`}>
                    {count}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              {Object.entries(scanModes).map(([mode, info]) => (
                <button key={mode} onClick={() => handleScan(site.id, mode)} disabled={scanning}
                  className="text-xs font-medium px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                  <span className="font-semibold">{info.description}</span>
                  <span className="text-gray-400 ml-1">({info.intervalMinutes}мин)</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        {scanning && (
          <div className="flex items-center gap-2 mt-3 text-sm text-blue-600">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            Scan ажиллаж байна...
          </div>
        )}
        {scanResult && <p className={`text-sm mt-2 ${scanResult.startsWith("✅") ? "text-green-600" : "text-red-500"}`}>{scanResult}</p>}

        {/* Recent runs */}
        {runs.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-2">Сүүлийн scan-ууд</p>
            <div className="space-y-1">
              {runs.slice(0, 5).map((run) => (
                <div key={run.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${run.status === "completed" ? "bg-green-500" : run.status === "running" ? "bg-blue-500 animate-pulse" : "bg-red-400"}`} />
                    <span className="text-gray-600">{run.pages_scraped} хуудас · {run.listings_new} шинэ · {run.listings_updated} шинэчлэгдсэн</span>
                  </div>
                  <span className="text-gray-400">{timeAgo(run.started_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Manual Input ─── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 text-sm mb-3">Гараар зар оруулах</h2>
        <div className="flex gap-2 mb-3">
          <button onClick={() => setInputMode("url")}
            className={`text-xs px-3 py-1.5 rounded-md font-medium ${inputMode === "url" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}>
            URL
          </button>
          <button onClick={() => setInputMode("text")}
            className={`text-xs px-3 py-1.5 rounded-md font-medium ${inputMode === "text" ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600"}`}>
            Текст
          </button>
        </div>
        {inputMode === "url" ? (
          <div className="flex gap-2">
            <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://www.unegui.mn/adv/12345_..." disabled={parsing}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" />
            <button onClick={handleParse} disabled={parsing || !urlInput.trim()}
              className="bg-blue-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {parsing ? "..." : "Задлах"}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-2 text-xs text-blue-700">
            Unegui.mn зарын хуудсыг нээж → Ctrl+A (бүгдийг сонгох) → Ctrl+C (хуулах) → доорх талбарт Ctrl+V (буулгах)
          </div>
          <textarea value={textInput} onChange={(e) => setTextInput(e.target.value)}
              placeholder={"Баянзүрх 13р хорооллд 3 өрөө 68м2 6/9 давхар зарна.\nҮнэ 185сая. Утас: 99112233\n\nЭсвэл unegui.mn хуудаснаас бүх текстийг хуулж paste хийнэ үү..."} rows={5} disabled={parsing}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" />
            <button onClick={handleParse} disabled={parsing || !textInput.trim()}
              className="bg-purple-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50">
              {parsing ? "AI задалж байна..." : "AI-р задлах"}
            </button>
          </div>
        )}
        {parseResult && <p className={`text-sm mt-2 ${parseResult.startsWith("✅") ? "text-green-600" : "text-red-500"}`}>{parseResult}</p>}
      </div>

      {/* ─── Listings Review ─── */}
      <div className="flex gap-1.5">
        {(["pending_review", "approved", "rejected", "stale"] as const).map((s) => (
          <button key={s} onClick={() => setTab(s)}
            className={`text-xs px-3 py-1.5 rounded-md font-medium ${tab === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {STATUS_LABELS[s] ?? s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 py-8 text-center text-gray-400 text-sm">Ачааллаж байна...</div>
      ) : listings.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-8 text-center">
          <p className="text-gray-400 text-sm">Зар олдсонгүй</p>
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map((item) => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex gap-4">
                {item.images?.[0] && (
                  <div className="w-24 h-20 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    <img src={item.images[0]} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">{item.title || "Гарчиггүй"}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
                        {item.price && <span className="font-medium text-blue-600">{formatPrice(item.price)}</span>}
                        {item.district && <span>{item.district}</span>}
                        {item.rooms && <span>{item.rooms} өрөө</span>}
                        {item.area_sqm && <span>{Number(item.area_sqm)}м²</span>}
                        {item.floor && item.total_floors && <span>{item.floor}/{item.total_floors}д</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.ai_confidence != null && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${Number(item.ai_confidence) >= 0.8 ? "bg-green-50 text-green-600" : Number(item.ai_confidence) >= 0.5 ? "bg-yellow-50 text-yellow-600" : "bg-red-50 text-red-500"}`}>
                          AI {Math.round(Number(item.ai_confidence) * 100)}%
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[item.status] ?? "bg-gray-100"}`}>
                        {STATUS_LABELS[item.status] ?? item.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>{item.source_site}</span>
                      {item.contact_phone && <span>📞 {item.contact_phone}</span>}
                      <span>{timeAgo(item.created_at)}</span>
                    </div>
                    {item.status === "pending_review" && (
                      <div className="flex gap-1.5">
                        <button onClick={() => handleAction(item.id, "approve")}
                          className="text-xs font-medium text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded-md">Зөвшөөрөх</button>
                        <button onClick={() => handleAction(item.id, "reject")}
                          className="text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md">Татгалзах</button>
                        <button onClick={() => handleDelete(item.id)}
                          className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">✕</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
