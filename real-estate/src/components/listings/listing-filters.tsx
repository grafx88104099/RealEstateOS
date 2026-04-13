"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface ListingFiltersProps {
  currentType?: string;
  currentQuery?: string;
  currentSort?: string;
  currentMinPrice?: string;
  currentMaxPrice?: string;
  currentRooms?: string;
  currentAgent?: string;
  propertyTypes: Record<string, string>;
  agents?: { id: string; name: string }[];
}

export function ListingFilters({
  currentType, currentQuery, currentSort,
  currentMinPrice, currentMaxPrice, currentRooms, currentAgent,
  propertyTypes, agents = [],
}: ListingFiltersProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(
    !!(currentMinPrice || currentMaxPrice || currentRooms || currentAgent)
  );

  function updateParam(key: string, value: string) {
    const url = new URL(window.location.href);
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
    router.push(url.pathname + url.search);
  }

  function clearAll() {
    const url = new URL(window.location.href);
    ["type", "q", "sort", "minPrice", "maxPrice", "rooms", "agent"].forEach((k) =>
      url.searchParams.delete(k)
    );
    router.push(url.pathname + url.search);
  }

  const hasFilters = !!(currentType || currentQuery || currentMinPrice || currentMaxPrice || currentRooms || currentAgent);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <select value={currentType ?? ""} onChange={(e) => updateParam("type", e.target.value)}
          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Бүх төрөл</option>
          {Object.entries(propertyTypes).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>

        <select value={currentSort ?? ""} onChange={(e) => updateParam("sort", e.target.value)}
          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Эрэмбэ: Шинэ</option>
          <option value="price_asc">Үнэ: Бага → Их</option>
          <option value="price_desc">Үнэ: Их → Бага</option>
          <option value="area_desc">Талбай: Их → Бага</option>
          <option value="rooms_desc">Өрөө: Их → Бага</option>
          <option value="oldest">Хуучин эхэнд</option>
        </select>

        <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); updateParam("q", fd.get("q") as string); }}>
          <input name="q" defaultValue={currentQuery} placeholder="Хайх..."
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-40" />
        </form>

        <button onClick={() => setExpanded(!expanded)}
          className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${expanded ? "border-blue-300 bg-blue-50 text-blue-600" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
          <svg className="w-3.5 h-3.5 inline mr-1" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
          </svg>
          Фильтр
        </button>

        {hasFilters && (
          <button onClick={clearAll} className="text-xs text-red-500 hover:text-red-600">Цэвэрлэх</button>
        )}
      </div>

      {/* Expanded filters */}
      {expanded && (
        <div className="flex flex-wrap items-center gap-2 bg-gray-50 rounded-lg p-3 border border-gray-100">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">Үнэ:</span>
            <input type="number" placeholder="Мин" value={currentMinPrice ?? ""}
              onChange={(e) => updateParam("minPrice", e.target.value)}
              className="w-24 border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <span className="text-xs text-gray-300">—</span>
            <input type="number" placeholder="Макс" value={currentMaxPrice ?? ""}
              onChange={(e) => updateParam("maxPrice", e.target.value)}
              className="w-24 border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">Өрөө:</span>
            <select value={currentRooms ?? ""} onChange={(e) => updateParam("rooms", e.target.value)}
              className="border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Бүгд</option>
              {[1, 2, 3, 4, 5].map((r) => <option key={r} value={String(r)}>{r}+</option>)}
            </select>
          </div>

          {agents.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400">Агент:</span>
              <select value={currentAgent ?? ""} onChange={(e) => updateParam("agent", e.target.value)}
                className="border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Бүгд</option>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
