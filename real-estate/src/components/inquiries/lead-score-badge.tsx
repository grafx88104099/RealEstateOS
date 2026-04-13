"use client";

import { useState } from "react";

interface LeadScoreBadgeProps {
  inquiryId: string;
}

interface ScoreResult {
  score: number;
  level: "hot" | "warm" | "cold";
  reasoning: string;
  suggestions: string[];
}

const LEVEL_STYLES = {
  hot: "bg-red-50 text-red-700 border-red-200",
  warm: "bg-yellow-50 text-yellow-700 border-yellow-200",
  cold: "bg-blue-50 text-blue-600 border-blue-200",
} as const;

const LEVEL_LABELS = {
  hot: "Халуун",
  warm: "Дулаан",
  cold: "Хүйтэн",
} as const;

export function LeadScoreBadge({ inquiryId }: LeadScoreBadgeProps) {
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function score() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/lead-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiry_id: inquiryId }),
      });
      if (res.ok) {
        setResult(await res.json());
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-gray-400">
        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Шинжилж байна...
      </span>
    );
  }

  if (!result) {
    return (
      <button
        onClick={score}
        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors"
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        AI оноо
      </button>
    );
  }

  return (
    <div className="inline-block">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors ${LEVEL_STYLES[result.level]}`}
      >
        <span className="tabular-nums">{result.score}</span>
        <span>{LEVEL_LABELS[result.level]}</span>
        <svg className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {expanded && (
        <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs max-w-xs">
          <p className="text-gray-700 mb-2">{result.reasoning}</p>
          {result.suggestions.length > 0 && (
            <div>
              <p className="font-medium text-gray-900 mb-1">Зөвлөмж:</p>
              <ul className="space-y-0.5 text-gray-600">
                {result.suggestions.map((s, i) => (
                  <li key={i} className="flex gap-1">
                    <span className="text-purple-500 shrink-0">-</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
