"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = [
  { value: "new", label: "Шинэ", color: "text-blue-700" },
  { value: "contacted", label: "Холбогдсон", color: "text-yellow-700" },
  { value: "viewing_scheduled", label: "Үзлэг товлосон", color: "text-purple-700" },
  { value: "negotiating", label: "Хэлэлцэж байна", color: "text-orange-700" },
  { value: "closed_won", label: "Амжилттай", color: "text-green-700" },
  { value: "closed_lost", label: "Цуцалсан", color: "text-gray-500" },
] as const;

interface InquiryStatusSelectProps {
  inquiryId: string;
  currentStatus: string;
}

export function InquiryStatusSelect({ inquiryId, currentStatus }: InquiryStatusSelectProps) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);

  async function handleChange(newStatus: string) {
    if (newStatus === status) return;
    setLoading(true);

    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === "contacted" || newStatus === "viewing_scheduled" || newStatus === "negotiating") {
      updates.contacted_at = new Date().toISOString();
    }
    if (newStatus === "closed_won" || newStatus === "closed_lost") {
      updates.closed_at = new Date().toISOString();
    }

    try {
      const res = await fetch(`/api/inquiries/${inquiryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        setStatus(newStatus);
        router.refresh();
      }
    } catch {
      // revert on error
    } finally {
      setLoading(false);
    }
  }

  const current = STATUSES.find((s) => s.value === status);

  return (
    <select
      value={status}
      onChange={(e) => handleChange(e.target.value)}
      disabled={loading}
      className={`text-xs font-medium px-2 py-1 rounded-md border border-gray-200 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${current?.color ?? ""}`}
    >
      {STATUSES.map((s) => (
        <option key={s.value} value={s.value}>{s.label}</option>
      ))}
    </select>
  );
}
