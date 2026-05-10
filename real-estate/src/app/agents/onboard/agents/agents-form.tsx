"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface InviteRow {
  id: string;
  fullName: string;
  email: string;
  status: "pending" | "loading" | "ok" | "err";
  link?: string;
  error?: string;
}

function newRow(): InviteRow {
  return { id: Math.random().toString(36).slice(2), fullName: "", email: "", status: "pending" };
}

export default function AgentsForm() {
  const router = useRouter();
  const [rows, setRows] = useState<InviteRow[]>([newRow()]);
  const [bulkLoading, setBulkLoading] = useState(false);

  function update(id: string, patch: Partial<InviteRow>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((rs) => [...rs, newRow()]);
  }

  function removeRow(id: string) {
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.id !== id) : rs));
  }

  async function inviteOne(row: InviteRow) {
    if (!row.email.trim()) {
      update(row.id, { status: "err", error: "Имэйл шаардлагатай" });
      return;
    }
    update(row.id, { status: "loading", error: undefined });
    try {
      const res = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: row.email.trim(),
          full_name: row.fullName.trim(),
          role: "agent",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Урих алдаа");
      update(row.id, { status: "ok", link: data.invite_link });
    } catch (err) {
      update(row.id, { status: "err", error: err instanceof Error ? err.message : "Алдаа" });
    }
  }

  async function inviteAll() {
    setBulkLoading(true);
    const pending = rows.filter((r) => r.status !== "ok" && r.email.trim());
    for (const row of pending) {
      await inviteOne(row);
    }
    setBulkLoading(false);
  }

  function copyLink(link: string) {
    navigator.clipboard?.writeText(link).catch(() => {});
  }

  function finish() {
    router.push("/agents/onboard/done");
    router.refresh();
  }

  const hasInvitableRow = rows.some((r) => r.email.trim() && r.status !== "ok");

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-5">
      <div className="space-y-3">
        {rows.map((row, idx) => (
          <div key={row.id} className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-7 h-7 mt-2 rounded-full bg-gray-100 text-gray-500 text-[12px] font-semibold flex items-center justify-center">
                {idx + 1}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                <input
                  type="text"
                  value={row.fullName}
                  onChange={(e) => update(row.id, { fullName: e.target.value })}
                  placeholder="Нэр"
                  disabled={row.status === "ok" || row.status === "loading"}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
                />
                <input
                  type="email"
                  value={row.email}
                  onChange={(e) => update(row.id, { email: e.target.value })}
                  placeholder="agent@office.mn"
                  disabled={row.status === "ok" || row.status === "loading"}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
              <div className="flex-shrink-0 flex items-center gap-1 pt-1">
                {row.status === "ok" ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1.5 rounded-md">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Уригдсан
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => inviteOne(row)}
                    disabled={row.status === "loading" || !row.email.trim()}
                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1.5 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {row.status === "loading" ? "..." : "Урих"}
                  </button>
                )}
                {rows.length > 1 && row.status !== "ok" && (
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    aria-label="Устгах"
                    className="text-gray-400 hover:text-rose-600 px-1.5 py-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {row.status === "ok" && row.link && (
              <div className="ml-9 pl-2 flex items-center gap-2 text-xs">
                <code className="flex-1 truncate bg-gray-50 border border-gray-200 rounded px-2 py-1 text-gray-600">
                  {row.link}
                </code>
                <button
                  type="button"
                  onClick={() => copyLink(row.link!)}
                  className="text-indigo-600 hover:text-indigo-700 font-medium px-2 py-1"
                >
                  Хуулах
                </button>
              </div>
            )}

            {row.status === "err" && row.error && (
              <p className="ml-9 pl-2 text-xs text-rose-600">{row.error}</p>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
      >
        + Өөр агент нэмэх
      </button>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={finish}
          className="text-sm text-gray-500 hover:text-gray-700 px-2 py-2 transition-colors"
        >
          Дараа нь →
        </button>
        <div className="flex items-center gap-2">
          {hasInvitableRow && (
            <button
              type="button"
              onClick={inviteAll}
              disabled={bulkLoading}
              className="text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-4 py-2.5 rounded-lg disabled:opacity-50 transition-colors"
            >
              {bulkLoading ? "Урьж байна..." : "Бүгдийг урих"}
            </button>
          )}
          <button
            type="button"
            onClick={finish}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:shadow-md hover:shadow-indigo-500/25 transition-all"
          >
            Дуусгах
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
