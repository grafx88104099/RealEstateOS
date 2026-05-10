"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  id: string;
  name: string;
  isActive: boolean;
  subscription: string;
}

export default function TenantActions({ id, name, isActive, subscription }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function patch(field: string, body: Record<string, unknown>, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusy(field);
    setErr(null);
    try {
      const res = await fetch(`/api/super/tenants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Алдаа");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Алдаа");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() =>
            patch("active", { is_active: !isActive }, isActive
              ? `"${name}" оффисыг хаах уу? Бүх зар, агентууд хариу нь гүйцэтгэхгүй.`
              : `"${name}" оффисыг идэвхжүүлэх үү?`)
          }
          disabled={busy !== null}
          className={`text-sm font-medium px-4 py-2 rounded-lg border transition-colors disabled:opacity-50 ${
            isActive
              ? "text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200"
              : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
          }`}
        >
          {busy === "active" ? "..." : isActive ? "Оффис хаах" : "Оффис идэвхжүүлэх"}
        </button>

        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Subscription:</label>
          <select
            defaultValue={subscription}
            disabled={busy !== null}
            onChange={(e) => patch("sub", { subscription: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
          >
            <option value="free">free</option>
            <option value="pro">pro</option>
            <option value="enterprise">enterprise</option>
          </select>
        </div>
      </div>

      {err && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs px-3 py-2">
          {err}
        </div>
      )}
    </div>
  );
}
