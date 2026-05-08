"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
}

export function UserActions({ user }: { user: User }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function toggleActive() {
    setLoading(true);
    await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !user.is_active }),
    });
    setLoading(false);
    router.refresh();
  }

  async function handleDelete() {
    setLoading(true);
    await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    setLoading(false);
    setConfirmDelete(false);
    router.refresh();
  }

  if (confirmDelete) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Устгах уу?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs text-red-600 font-medium hover:underline disabled:opacity-50"
        >
          {loading ? "..." : "Тийм"}
        </button>
        <button
          onClick={() => setConfirmDelete(false)}
          className="text-xs text-gray-500 hover:underline"
        >
          Үгүй
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={toggleActive}
        disabled={loading}
        className={`text-xs font-medium hover:underline disabled:opacity-50 ${
          user.is_active ? "text-amber-600" : "text-green-600"
        }`}
      >
        {loading ? "..." : user.is_active ? "Идэвхгүй болгох" : "Идэвхжүүлэх"}
      </button>
      <button
        onClick={() => setConfirmDelete(true)}
        className="text-xs text-red-500 hover:underline"
      >
        Устгах
      </button>
    </div>
  );
}
