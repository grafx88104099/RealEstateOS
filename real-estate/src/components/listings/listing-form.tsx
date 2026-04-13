"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DISTRICTS, PROPERTY_TYPES } from "@/lib/constants/listings";

interface ListingFormProps {
  redirectOnSuccess?: string;
}

export function ListingForm({ redirectOnSuccess = "/dashboard/listings" }: ListingFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", price: "",
    rooms: "", area_sqm: "", floor: "", total_floors: "",
    property_type: "apartment", listing_type: "sale",
    district: "", address: "",
  });

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function generateDescription() {
    if (!form.title) {
      setError("AI тайлбар үүсгэхийн тулд гарчиг бичнэ үү");
      return;
    }
    setAiLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          property_type: form.property_type,
          listing_type: form.listing_type,
          price: form.price ? Number(form.price) : 0,
          rooms: form.rooms ? Number(form.rooms) : undefined,
          area_sqm: form.area_sqm ? Number(form.area_sqm) : undefined,
          floor: form.floor ? Number(form.floor) : undefined,
          total_floors: form.total_floors ? Number(form.total_floors) : undefined,
          district: form.district || undefined,
          address: form.address || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "AI тайлбар үүсгэхэд алдаа гарлаа");
      } else {
        setForm((prev) => ({ ...prev, description: data.description }));
      }
    } catch {
      setError("AI тайлбар үүсгэхэд алдаа гарлаа");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        price: Number(form.price),
        rooms: form.rooms ? Number(form.rooms) : null,
        area_sqm: form.area_sqm ? Number(form.area_sqm) : null,
        floor: form.floor ? Number(form.floor) : null,
        total_floors: form.total_floors ? Number(form.total_floors) : null,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Алдаа гарлаа");
      setLoading(false);
      return;
    }

    router.push(redirectOnSuccess);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-xl border border-gray-200 p-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Гарчиг *</label>
        <input
          value={form.title} onChange={(e) => set("title", e.target.value)}
          required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="3 өрөө орон сууц СБД-д"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">Тайлбар</label>
          <button
            type="button"
            onClick={generateDescription}
            disabled={aiLoading}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-md transition-colors disabled:opacity-50"
          >
            {aiLoading ? (
              <>
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Бичиж байна...
              </>
            ) : (
              <>
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" /></svg>
                AI-р бичүүлэх
              </>
            )}
          </button>
        </div>
        <textarea
          value={form.description} onChange={(e) => set("description", e.target.value)}
          rows={4} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Орон сууцны дэлгэрэнгүй мэдээлэл... (AI-р автомат бичүүлэх боломжтой)"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Үл хөдлөхийн төрөл</label>
          <select value={form.property_type} onChange={(e) => set("property_type", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {PROPERTY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Зарах / Түрээслэх</label>
          <select value={form.listing_type} onChange={(e) => set("listing_type", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="sale">Зарах</option>
            <option value="rent">Түрээслэх</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Үнэ (₮) *</label>
          <input type="number" value={form.price} onChange={(e) => set("price", e.target.value)}
            required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="150000000" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Талбай (м²)</label>
          <input type="number" value={form.area_sqm} onChange={(e) => set("area_sqm", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="65" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Өрөөний тоо</label>
          <input type="number" value={form.rooms} onChange={(e) => set("rooms", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="3" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Давхар</label>
          <input type="number" value={form.floor} onChange={(e) => set("floor", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="5" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Нийт давхар</label>
          <input type="number" value={form.total_floors} onChange={(e) => set("total_floors", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="12" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Дүүрэг</label>
          <select value={form.district} onChange={(e) => set("district", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">— сонгох —</option>
            {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Хаяг</label>
          <input value={form.address} onChange={(e) => set("address", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Энхтайваны өргөн чөлөө 10" />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading}
          className="bg-blue-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {loading ? "Хадгалж байна..." : "Зар нэмэх"}
        </button>
        <button type="button" onClick={() => router.back()}
          className="text-gray-600 text-sm font-medium px-5 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
          Цуцлах
        </button>
      </div>
    </form>
  );
}
