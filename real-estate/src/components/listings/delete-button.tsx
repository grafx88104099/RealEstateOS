"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteListingButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Энэ зарыг устгах уу?")) return;
    setLoading(true);
    await fetch(`/api/listings/${id}`, { method: "DELETE" });
    router.push("/dashboard/listings");
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-sm text-red-600 border border-red-200 px-4 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
    >
      {loading ? "Устгаж байна..." : "Устгах"}
    </button>
  );
}
