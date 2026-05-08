"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  id: string;
  initialEnabled: boolean;
  initialAutoPromote: boolean;
}

export function SourceToggles({
  id,
  initialEnabled,
  initialAutoPromote,
}: Props) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [autoPromote, setAutoPromote] = useState(initialAutoPromote);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const patch = async (body: Record<string, unknown>) => {
    setError(null);
    const res = await fetch(`/api/super/scraper/sources/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? `HTTP ${res.status}`);
      return false;
    }
    startTransition(() => router.refresh());
    return true;
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={async () => {
          const next = !enabled;
          setEnabled(next);
          if (!(await patch({ enabled: next }))) setEnabled(!next);
        }}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${
          enabled ? "bg-emerald-600" : "bg-gray-300"
        }`}
        aria-pressed={enabled}
        title="Enabled"
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white mt-0.5 transition-transform ${
            enabled ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
      <button
        onClick={async () => {
          const next = !autoPromote;
          setAutoPromote(next);
          if (!(await patch({ auto_promote: next }))) setAutoPromote(!next);
        }}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${
          autoPromote ? "bg-indigo-600" : "bg-gray-300"
        }`}
        aria-pressed={autoPromote}
        title="Auto-promote (Phase B)"
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white mt-0.5 transition-transform ${
            autoPromote ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
