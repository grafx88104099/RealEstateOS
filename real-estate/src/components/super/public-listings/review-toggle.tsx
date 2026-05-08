"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  tenantId: string;
  initial: boolean;
}

export function ReviewToggle({ tenantId, initial }: Props) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    const next = !enabled;
    setEnabled(next);
    setError(null);
    const res = await fetch(`/api/admin/tenants/${tenantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requires_listing_review: next }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? `HTTP ${res.status}`);
      setEnabled(!next);
      return;
    }
    startTransition(() => router.refresh());
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggle}
        disabled={isPending}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${
          enabled ? "bg-blue-600" : "bg-gray-300"
        } ${isPending ? "opacity-50" : ""}`}
        aria-pressed={enabled}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform mt-0.5 ${
            enabled ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
