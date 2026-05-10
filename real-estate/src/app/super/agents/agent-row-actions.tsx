"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AgentRowActions({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (loading) return;
    const action = isActive ? "хаах" : "идэвхжүүлэх";
    if (!confirm(`Энэ агентыг ${action} уу?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !isActive }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Алдаа гарлаа");
        setLoading(false);
        return;
      }
      router.refresh();
    } catch {
      alert("Сүлжээний алдаа");
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`text-xs font-medium px-3 py-1.5 rounded-md border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        isActive
          ? "text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200"
          : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
      }`}
    >
      {loading ? "..." : isActive ? "Хаах" : "Идэвхжүүлэх"}
    </button>
  );
}
