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
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isLoggedIn) {
    return (
      <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6 text-center">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <p className="text-gray-700 font-medium mb-1">Агентад холбогдох</p>
        <p className="text-sm text-gray-500 mb-4">Хүсэлт илгээхийн тулд нэвтрэх шаардлагатай</p>
        <div className="flex gap-2">
          <Link href="/login" className="flex-1 text-center text-sm font-medium border border-gray-300 text-gray-700 rounded-lg py-2 hover:bg-gray-100 transition-colors">
            Нэвтрэх
          </Link>
          <Link href="/register?mode=consumer" className="flex-1 text-center text-sm font-medium bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700 transition-colors">
            Бүртгүүлэх
          </Link>
        </div>
      </div>
    );
  }

  if (!isConsumer) {
    return (
      <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5 text-center">
        <p className="text-sm text-gray-500">Хүсэлт илгээх боломж зөвхөн хэрэглэгчдэд байна</p>
      </div>
    );
  }

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
        <Link href="/consumer/inquiries" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
          Миний хүсэлтүүд →
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listing_id: listingId, message }),
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

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      <h3 className="font-semibold text-gray-900">Агентад хүсэлт илгээх</h3>
      <div>
        <label className="block text-sm text-gray-600 mb-1.5">Мессеж (заавал биш)</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Энэ зарт сонирхолтой байна, дэлгэрэнгүй мэдээлэл авмаар байна..."
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
    </form>
  );
}
