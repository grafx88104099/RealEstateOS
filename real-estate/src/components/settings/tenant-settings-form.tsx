"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Settings {
  commission_rate: number;
  agent_split: number;
  auto_embed: boolean;
  ai_description: boolean;
  ai_lead_score: boolean;
  ai_copilot: boolean;
  default_listing_status: string;
  contact_phone: string;
  contact_email: string;
  website: string;
}

interface Props {
  tenantId: string;
  currentSettings: Settings;
}

export function TenantSettingsForm({ tenantId, currentSettings }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<Settings>(currentSettings);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    setError(null);

    try {
      const res = await fetch("/api/admin/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenantId, settings: form }),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error ?? "Хадгалахад алдаа гарлаа");
      }
    } catch {
      setError("Холболтын алдаа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Contact Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 text-sm mb-4">Холбоо барих</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Утасны дугаар</label>
            <input value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)}
              placeholder="99001122"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">И-мэйл</label>
            <input value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)}
              placeholder="info@agency.mn"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Вебсайт</label>
            <input value={form.website} onChange={(e) => set("website", e.target.value)}
              placeholder="https://agency.mn"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </div>

      {/* Commission Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 text-sm mb-4">Комиссийн тохиргоо</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Комиссийн хувь (%)</label>
            <input type="number" value={form.commission_rate} onChange={(e) => set("commission_rate", Number(e.target.value))}
              min="0" max="100" step="0.5"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Агентын хувь (%)</label>
            <input type="number" value={form.agent_split} onChange={(e) => set("agent_split", Number(e.target.value))}
              min="0" max="100" step="5"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex items-end pb-2">
            <p className="text-xs text-gray-400">Оффис: {100 - form.agent_split}%</p>
          </div>
        </div>
      </div>

      {/* AI Feature Toggles */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 text-sm mb-4">AI боломжууд</h2>
        <div className="space-y-3">
          {[
            { key: "auto_embed" as const, label: "Автомат AI embedding", desc: "Зар нэмэхэд vector embedding автоматаар хийгдэнэ" },
            { key: "ai_description" as const, label: "AI зар тайлбар", desc: "Зар нэмэхэд AI-р тайлбар бичүүлэх боломж" },
            { key: "ai_lead_score" as const, label: "AI Lead scoring", desc: "Хүсэлтийн чанарыг AI-р үнэлэх" },
            { key: "ai_copilot" as const, label: "AI Copilot чат", desc: "Агентуудад AI туслах чат идэвхжүүлэх" },
          ].map((item) => (
            <label key={item.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-400">{item.desc}</p>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={form[item.key]}
                  onChange={(e) => set(item.key, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-checked:bg-blue-600 rounded-full transition-colors" />
                <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-4 transition-transform" />
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Listing Defaults */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 text-sm mb-4">Зарын тохиргоо</h2>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Шинэ зарын анхдагч төлөв</label>
          <select value={form.default_listing_status} onChange={(e) => set("default_listing_status", e.target.value)}
            className="w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="active">Идэвхтэй (шууд нийтлэх)</option>
            <option value="draft">Ноорог (хянуулах)</option>
            <option value="pending_review">Хянагдаж байна</option>
          </select>
        </div>
      </div>

      {/* Save */}
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {saved && <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">Амжилттай хадгаллаа</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={loading}
          className="bg-blue-600 text-white text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {loading ? "Хадгалж байна..." : "Хадгалах"}
        </button>
      </div>
    </form>
  );
}
