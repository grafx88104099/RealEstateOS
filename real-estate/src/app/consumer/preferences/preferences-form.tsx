"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DISTRICTS, PROPERTY_TYPES } from "@/lib/constants/listings";

interface Prefs {
  id?: string;
  description?: string | null;
  min_price?: number | null;
  max_price?: number | null;
  min_rooms?: number | null;
  max_rooms?: number | null;
  property_types?: string[] | null;
  preferred_districts?: string[] | null;
  min_area_sqm?: number | null;
  max_area_sqm?: number | null;
}

export default function BuyerPreferencesForm({ initialPrefs }: { initialPrefs: Prefs | null }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    description: initialPrefs?.description ?? "",
    min_price: initialPrefs?.min_price?.toString() ?? "",
    max_price: initialPrefs?.max_price?.toString() ?? "",
    min_rooms: initialPrefs?.min_rooms?.toString() ?? "",
    max_rooms: initialPrefs?.max_rooms?.toString() ?? "",
    min_area_sqm: initialPrefs?.min_area_sqm?.toString() ?? "",
    max_area_sqm: initialPrefs?.max_area_sqm?.toString() ?? "",
    property_types: initialPrefs?.property_types ?? [] as string[],
    preferred_districts: initialPrefs?.preferred_districts ?? [] as string[],
  });

  function toggleArray(field: "property_types" | "preferred_districts", value: string) {
    setForm((prev) => {
      const arr = prev[field];
      return {
        ...prev,
        [field]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const body = {
      description: form.description || null,
      min_price: form.min_price ? Number(form.min_price) : null,
      max_price: form.max_price ? Number(form.max_price) : null,
      min_rooms: form.min_rooms ? Number(form.min_rooms) : null,
      max_rooms: form.max_rooms ? Number(form.max_rooms) : null,
      min_area_sqm: form.min_area_sqm ? Number(form.min_area_sqm) : null,
      max_area_sqm: form.max_area_sqm ? Number(form.max_area_sqm) : null,
      property_types: form.property_types.length > 0 ? form.property_types : null,
      preferred_districts: form.preferred_districts.length > 0 ? form.preferred_districts : null,
    };

    const res = await fetch("/api/buyer/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Хадгалахад алдаа гарлаа");
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Тайлбар</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            rows={3}
            placeholder="Жишээ: СБД-д гэр бүлд тохиромжтой 3 өрөө орон сууц хайж байна, нарны гэрэлтэй байх нь чухал"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Доод үнэ (₮)</label>
            <input
              type="number"
              value={form.min_price}
              onChange={(e) => setForm((p) => ({ ...p, min_price: e.target.value }))}
              placeholder="50000000"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Дээд үнэ (₮)</label>
            <input
              type="number"
              value={form.max_price}
              onChange={(e) => setForm((p) => ({ ...p, max_price: e.target.value }))}
              placeholder="200000000"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Доод өрөө</label>
            <input
              type="number"
              value={form.min_rooms}
              onChange={(e) => setForm((p) => ({ ...p, min_rooms: e.target.value }))}
              placeholder="2"
              min="1"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Дээд өрөө</label>
            <input
              type="number"
              value={form.max_rooms}
              onChange={(e) => setForm((p) => ({ ...p, max_rooms: e.target.value }))}
              placeholder="5"
              min="1"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Доод талбай (м²)</label>
            <input
              type="number"
              value={form.min_area_sqm}
              onChange={(e) => setForm((p) => ({ ...p, min_area_sqm: e.target.value }))}
              placeholder="50"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Дээд талбай (м²)</label>
            <input
              type="number"
              value={form.max_area_sqm}
              onChange={(e) => setForm((p) => ({ ...p, max_area_sqm: e.target.value }))}
              placeholder="150"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <label className="block text-sm font-medium text-gray-700 mb-3">Үл хөдлөхийн төрөл</label>
        <div className="flex flex-wrap gap-2">
          {PROPERTY_TYPES.map((pt) => (
            <button
              key={pt.value}
              type="button"
              onClick={() => toggleArray("property_types", pt.value)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                form.property_types.includes(pt.value)
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
              }`}
            >
              {pt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <label className="block text-sm font-medium text-gray-700 mb-3">Дүүрэг</label>
        <div className="flex flex-wrap gap-2">
          {DISTRICTS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => toggleArray("preferred_districts", d)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                form.preferred_districts.includes(d)
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      {saved && (
        <div className="bg-green-50 text-green-700 text-sm rounded-lg px-4 py-3">Амжилттай хадгаллаа</div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full bg-blue-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {saving ? "Хадгалж байна..." : "Хадгалах"}
      </button>
    </form>
  );
}
