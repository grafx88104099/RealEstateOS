"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CommissionRateFormProps {
  tenantId: string;
  currentRate: number;
  currentSplit: number;
}

export function CommissionRateForm({ tenantId, currentRate, currentSplit }: CommissionRateFormProps) {
  const router = useRouter();
  const [rate, setRate] = useState(String(currentRate));
  const [split, setSplit] = useState(String(currentSplit));
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);

  async function save() {
    setLoading(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          settings: {
            commission_rate: Number(rate),
            agent_split: Number(split),
          },
        }),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-gray-500 hover:text-gray-700 underline"
      >
        Комиссийн тохиргоо засах
      </button>
    );
  }

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Комиссийн тохиргоо</h3>
        <button onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:text-gray-600">Хаах</button>
      </div>
      <div className="flex items-end gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Комиссийн хувь (%)</label>
          <input
            type="number"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            min="0" max="100" step="0.5"
            className="w-24 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Агентын хувь (%)</label>
          <input
            type="number"
            value={split}
            onChange={(e) => setSplit(e.target.value)}
            min="0" max="100" step="5"
            className="w-24 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="text-xs text-gray-400 pb-1.5">
          Агентлагийн хувь: {100 - Number(split)}%
        </div>
        <button
          onClick={save}
          disabled={loading}
          className="bg-blue-600 text-white text-xs font-medium px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "..." : "Хадгалах"}
        </button>
        {saved && <span className="text-xs text-green-600 pb-1.5">Хадгалсан</span>}
      </div>
    </div>
  );
}
