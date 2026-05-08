"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function TestScanButton({ sourceId }: { sourceId: string }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch(
        `/api/super/scraper/sources/${sourceId}/test`,
        { method: "POST" },
      );
      const j = await res.json();
      if (!res.ok) {
        setError(j.error ?? `HTTP ${res.status}`);
        return;
      }
      const promoted = j.ingest?.promoted ?? 0;
      const newCount = j.scan?.new ?? 0;
      setResult(`✓ ${newCount} шинэ зар olc, ${promoted}-ыг pending_review-руу нийтэлсэн`);
      startTransition(() => router.refresh());
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={run}
        disabled={running}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {running ? (
          <>
            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Скан явагдаж байна...
          </>
        ) : (
          "Тест скан"
        )}
      </button>
      {result && (
        <div className="text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
          {result}
        </div>
      )}
      {error && (
        <div className="text-xs text-red-700 bg-red-50 px-3 py-2 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
}
