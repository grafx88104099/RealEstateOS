"use client";

import { useState } from "react";
import Link from "next/link";

interface InquiryFormProps {
  listingId: string;
  isLoggedIn: boolean;
  isConsumer: boolean;
}

export default function InquiryForm({ listingId, isLoggedIn, isConsumer }: InquiryFormProps) {
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (success) {
    return (
      <div className="bg-green-50 rounded-2xl border border-green-200 p-6 text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-green-800 font-medium">Хүсэлт амжилттай илгээгдлээ</p>
        <p className="text-sm text-green-600 mt-1">Агент тантай удахгүй холбогдох болно</p>
        {isLoggedIn && isConsumer && (
          <Link href="/consumer/inquiries" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
            Миний хүсэлтүүд →
          </Link>
        )}
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload: Record<string, unknown> = { listing_id: listingId, message };
    if (!isLoggedIn) {
      payload.guest_name = name;
      payload.guest_email = email;
      payload.guest_phone = phone;
    }

    const res = await fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Алдаа гарлаа");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  // Logged in but not consumer — agent/admin viewing competitor listing
  if (isLoggedIn && !isConsumer) {
    return (
      <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5 text-center">
        <p className="text-sm text-gray-500">Та өөр оффисын зар үзэж байна. Худалдан авагч талын данс шаардлагатай.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      <h3 className="font-semibold text-gray-900">Агентад хүсэлт илгээх</h3>

      {!isLoggedIn && (
        <>
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Овог нэр <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              placeholder="Батбаяр"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Утас</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9911 1234"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Имэйл</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <p className="text-[11px] text-gray-400">Утас эсвэл имэйл аль нэг шаардлагатай</p>
        </>
      )}

      <div>
        <label className="block text-sm text-gray-600 mb-1.5">Мессеж (заавал биш)</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Энэ зар сонирхолтой байна, дэлгэрэнгүй мэдээлэл авмаар байна..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Илгээж байна..." : "Хүсэлт илгээх"}
      </button>

      {!isLoggedIn && (
        <p className="text-[11px] text-gray-400 text-center">
          Нэвтэрсэн бол хүсэлтийн түүх <Link href="/login" className="text-indigo-600 hover:underline">энд</Link> хадгалагдана
        </p>
      )}
    </form>
  );
}
