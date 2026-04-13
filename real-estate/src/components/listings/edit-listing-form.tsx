"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DISTRICTS, PROPERTY_TYPES } from "@/lib/constants/listings";

interface EditListingFormProps {
  listing: {
    id: string;
    title: string;
    description: string | null;
    price: number;
    rooms: number | null;
    area_sqm: number | null;
    floor: number | null;
    total_floors: number | null;
    property_type: string;
    listing_type: string;
    district: string | null;
    address: string | null;
    status: string;
  };
  backUrl?: string;
}

const STATUS_OPTIONS = [
  { value: "active", label: "Идэвхтэй" },
  { value: "draft", label: "Ноорог" },
  { value: "sold", label: "Зарагдсан" },
  { value: "rented", label: "Түрээслэгдсэн" },
  { value: "expired", label: "Хугацаа дууссан" },
  { value: "archived", label: "Архивлагдсан" },
];

export function EditListingForm({ listing, backUrl = "/dashboard/listings" }: EditListingFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    title: listing.title,
    description: listing.description ?? "",
    price: String(listing.price),
    rooms: listing.rooms != null ? String(listing.rooms) : "",
    area_sqm: listing.area_sqm != null ? String(listing.area_sqm) : "",
    floor: listing.floor != null ? String(listing.floor) : "",
    total_floors: listing.total_floors != null ? String(listing.total_floors) : "",
    property_type: listing.property_type,
    listing_type: listing.listing_type,
    district: listing.district ?? "",
    address: listing.address ?? "",
    status: listing.status,
  });

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function generateDescription() {
    if (!form.title) { setError("Гарчиг бичнэ үү"); return; }
    setAiLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title, property_type: form.property_type, listing_type: form.listing_type,
          price: form.price ? Number(form.price) : 0,
          rooms: form.rooms ? Number(form.rooms) : undefined,
          area_sqm: form.area_sqm ? Number(form.area_sqm) : undefined,
          floor: form.floor ? Number(form.floor) : undefined,
          total_floors: form.total_floors ? Number(form.total_floors) : undefined,
          district: form.district || undefined, address: form.address || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) setForm((prev) => ({ ...prev, description: data.description }));
      else setError(data.error ?? "AI алдаа");
    } catch { setError("AI алдаа"); }
    finally { setAiLoading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const res = await fetch(`/api/listings/${listing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description || null,
        price: Number(form.price),
        rooms: form.rooms ? Number(form.rooms) : null,
        area_sqm: form.area_sqm ? Number(form.area_sqm) : null,
        floor: form.floor ? Number(form.floor) : null,
        total_floors: form.total_floors ? Number(form.total_floors) : null,
        property_type: form.property_type,
        listing_type: form.listing_type,
        district: form.district || null,
        address: form.address || null,
        status: form.status,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Алдаа гарлаа");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-xl border border-gray-200 p-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Гарчиг *</label>
        <input value={form.title} onChange={(e) => set("title", e.target.value)} required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">Тайлбар</label>
          <button type="button" onClick={generateDescription} disabled={aiLoading}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-md transition-colors disabled:opacity-50">
            {aiLoading ? (
              <><svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Бичиж байна...</>
            ) : (
              <><svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>AI-р бичүүлэх</>
            )}
          </button>
        </div>
        <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={4}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Төрөл</label>
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
          <select value={form.status} onChange={(e) => set("status", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Үнэ (₮) *</label>
          <input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Талбай (м²)</label>
          <input type="number" value={form.area_sqm} onChange={(e) => set("area_sqm", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Өрөөний тоо</label>
          <input type="number" value={form.rooms} onChange={(e) => set("rooms", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Давхар</label>
          <input type="number" value={form.floor} onChange={(e) => set("floor", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Нийт давхар</label>
          <input type="number" value={form.total_floors} onChange={(e) => set("total_floors", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {success && <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">Амжилттай хадгаллаа</p>}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading}
          className="bg-blue-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {loading ? "Хадгалж байна..." : "Хадгалах"}
        </button>
        <button type="button" onClick={() => router.push(backUrl)}
          className="text-gray-600 text-sm font-medium px-5 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
          Буцах
        </button>
      </div>
    </form>
  );
}
