"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
 

interface ListingItem {
  id: string;
  title: string;
  status: string;
  price: number;
  rooms: number | null;
  area_sqm: number | null;
  district: string | null;
  property_type: string;
  created_at: string;
  agent_name: string | null;
  cover_url?: string | null;
}

interface ListingsViewProps {
  listings: ListingItem[];
  statusLabels: Record<string, string>;
  statusColors: Record<string, string>;
  propertyTypeLabels: Record<string, string>;
}

type ViewMode = "table" | "grid" | "kanban";

function formatPrice(p: number) {
  if (p >= 1_000_000_000) return `${(p / 1_000_000_000).toFixed(1)} тэрбум₮`;
  if (p >= 1_000_000) return `${(p / 1_000_000).toFixed(0)} сая₮`;
  return `${p.toLocaleString()}₮`;
}

const KANBAN_ORDER = ["draft", "pending_review", "active", "sold", "rented", "expired", "archived"];

export function ListingsView({ listings, statusLabels, statusColors, propertyTypeLabels }: ListingsViewProps) {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("table");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Bulk selection
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === listings.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(listings.map((l) => l.id)));
    }
  }

  async function bulkUpdateStatus(newStatus: string) {
    if (selected.size === 0) return;
    setBulkLoading(true);
    const promises = Array.from(selected).map((id) =>
      fetch(`/api/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
    );
    await Promise.all(promises);
    setBulkLoading(false);
    setSelected(new Set());
    router.refresh();
  }

  async function bulkDelete() {
    if (selected.size === 0 || !confirm(`${selected.size} зар устгах уу?`)) return;
    setBulkLoading(true);
    const promises = Array.from(selected).map((id) =>
      fetch(`/api/listings/${id}`, { method: "DELETE" })
    );
    await Promise.all(promises);
    setBulkLoading(false);
    setSelected(new Set());
    router.refresh();
  }

  function exportCSV() {
    const items = selected.size > 0 ? listings.filter((l) => selected.has(l.id)) : listings;
    const header = "Гарчиг,Төрөл,Үнэ,Дүүрэг,Өрөө,Талбай,Статус,Агент,Огноо\n";
    const rows = items.map((l) =>
      `"${l.title}","${propertyTypeLabels[l.property_type] ?? l.property_type}",${l.price},"${l.district ?? ""}",${l.rooms ?? ""},${l.area_sqm ?? ""},"${statusLabels[l.status] ?? l.status}","${l.agent_name ?? ""}","${new Date(l.created_at).toLocaleDateString("mn-MN")}"`
    ).join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `listings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {/* View toggle + Bulk actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {[
              { mode: "table" as const, icon: "M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0v1.5" },
              { mode: "grid" as const, icon: "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" },
              { mode: "kanban" as const, icon: "M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" },
            ].map(({ mode, icon }) => (
              <button key={mode} onClick={() => setView(mode)}
                className={`p-1.5 rounded-md transition-colors ${view === mode ? "bg-white shadow-sm text-blue-600" : "text-gray-400 hover:text-gray-600"}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                </svg>
              </button>
            ))}
          </div>
        </div>

        {/* Bulk actions */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">{selected.size} сонгосон</span>
            <select onChange={(e) => { if (e.target.value) bulkUpdateStatus(e.target.value); e.target.value = ""; }}
              disabled={bulkLoading}
              className="border border-gray-200 rounded-md px-2 py-1 text-xs">
              <option value="">Статус солих...</option>
              {Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            {selected.size >= 2 && selected.size <= 4 && (
              <Link href={`/dashboard/listings/compare?ids=${Array.from(selected).join(",")}`}
                className="text-xs text-purple-600 hover:text-purple-700 font-medium">Харьцуулах</Link>
            )}
            <button onClick={exportCSV} className="text-xs text-blue-600 hover:text-blue-700 font-medium">CSV</button>
            <button onClick={bulkDelete} disabled={bulkLoading}
              className="text-xs text-red-500 hover:text-red-600 font-medium">Устгах</button>
            <button onClick={() => setSelected(new Set())} className="text-xs text-gray-400 hover:text-gray-600">Цуцлах</button>
          </div>
        )}
        {selected.size === 0 && (
          <button onClick={exportCSV} className="text-xs text-gray-500 hover:text-gray-700">CSV татах</button>
        )}
      </div>

      {/* TABLE VIEW */}
      {view === "table" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-8 px-3 py-3">
                  <input type="checkbox" checked={selected.size === listings.length && listings.length > 0}
                    onChange={toggleSelectAll} className="rounded border-gray-300" />
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Гарчиг</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Төрөл</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Үнэ</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Дүүрэг</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Агент</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Статус</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Огноо</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {listings.map((l) => (
                <tr key={l.id} className={`hover:bg-gray-50 ${selected.has(l.id) ? "bg-blue-50" : ""}`}>
                  <td className="w-8 px-3 py-3">
                    <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleSelect(l.id)} className="rounded border-gray-300" />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/listings/${l.id}`} className="font-medium text-gray-900 hover:text-blue-600">{l.title}</Link>
                    <p className="text-xs text-gray-400 mt-0.5">{l.rooms ? `${l.rooms} өрөө` : ""} {l.area_sqm ? `${l.area_sqm}м²` : ""}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{propertyTypeLabels[l.property_type] ?? l.property_type}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{formatPrice(l.price)}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{l.district ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{l.agent_name || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[l.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {statusLabels[l.status] ?? l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(l.created_at).toLocaleDateString("mn-MN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* GRID VIEW */}
      {view === "grid" && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((l) => (
            <Link key={l.id} href={`/dashboard/listings/${l.id}`}
              className={`bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow ${selected.has(l.id) ? "ring-2 ring-blue-500" : ""}`}>
              {/* Cover image placeholder */}
              <div className="aspect-[16/10] bg-gray-100 relative">
                {l.cover_url ? (
                  <img src={l.cover_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M6.75 7.5l.75-.75" />
                    </svg>
                  </div>
                )}
                <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColors[l.status] ?? "bg-gray-100 text-gray-600"}`}>
                  {statusLabels[l.status] ?? l.status}
                </span>
                {/* Checkbox */}
                <div className="absolute top-2 left-2" onClick={(e) => { e.preventDefault(); toggleSelect(l.id); }}>
                  <input type="checkbox" checked={selected.has(l.id)} readOnly className="rounded border-gray-300" />
                </div>
              </div>
              <div className="p-3">
                <p className="font-medium text-gray-900 text-sm truncate">{l.title}</p>
                <p className="text-lg font-bold text-blue-600 mt-1">{formatPrice(l.price)}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                  {l.district && <span>{l.district}</span>}
                  {l.rooms && <span>{l.rooms} өрөө</span>}
                  {l.area_sqm && <span>{l.area_sqm}м²</span>}
                </div>
                {l.agent_name && <p className="text-xs text-gray-400 mt-1">{l.agent_name}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* KANBAN VIEW */}
      {view === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_ORDER.map((status) => {
            const items = listings.filter((l) => l.status === status);
            if (items.length === 0 && !["draft", "active", "sold"].includes(status)) return null;
            return (
              <div key={status} className="min-w-[260px] w-[260px] shrink-0">
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[status] ?? "bg-gray-100"}`}>
                      {statusLabels[status] ?? status}
                    </span>
                    <span className="text-xs text-gray-400">{items.length}</span>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-2 min-h-[200px] space-y-2">
                  {items.map((l) => (
                    <Link key={l.id} href={`/dashboard/listings/${l.id}`}
                      className="block bg-white rounded-lg border border-gray-200 p-3 hover:shadow-sm transition-shadow">
                      <p className="text-sm font-medium text-gray-900 truncate">{l.title}</p>
                      <p className="text-sm font-bold text-blue-600 mt-1">{formatPrice(l.price)}</p>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400">
                        {l.district && <span>{l.district}</span>}
                        {l.rooms && <span>{l.rooms} өрөө</span>}
                      </div>
                      {l.agent_name && <p className="text-xs text-gray-400 mt-1">{l.agent_name}</p>}
                    </Link>
                  ))}
                  {items.length === 0 && (
                    <p className="text-xs text-gray-300 text-center py-8">Зар байхгүй</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
