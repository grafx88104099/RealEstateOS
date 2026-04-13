"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DuplicateButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function duplicate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/duplicate`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        router.push(`/dashboard/listings/${data.listing_id}`);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  return (
    <button onClick={duplicate} disabled={loading}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50">
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
      </svg>
      {loading ? "Хуулж байна..." : "Хуулах"}
    </button>
  );
}
