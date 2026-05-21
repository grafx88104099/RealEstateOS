"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AssignAgentProps {
  inquiryId: string;
  currentAgentName?: string;
}

interface AssignResult {
  assigned_agent: { id: string; name: string };
  reasoning: string;
  confidence: number;
}

export function AssignAgent({ inquiryId }: AssignAgentProps) {
  const router = useRouter();
  const [result, setResult] = useState<AssignResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [assigned, setAssigned] = useState(false);

  async function suggest() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/assign-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiry_id: inquiryId }),
      });
      if (res.ok) {
        setResult(await res.json());
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  async function confirmAssign() {
    if (!result) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/inquiries/${inquiryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "contacted", contacted_at: new Date().toISOString() }),
      });
      if (res.ok) {
        setAssigned(true);
        router.refresh();
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  if (assigned) {
    return <span className="text-xs text-green-600 font-medium">Хуваарилсан</span>;
  }

  if (loading) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
      </span>
    );
  }

  if (!result) {
    return (
      <button onClick={suggest}
        className="inline-flex items-center gap-1 text-xs font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 px-2 py-0.5 rounded-md transition-colors">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
        AI хуваарилах
      </button>
    );
  }

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-2.5 mt-2 text-xs">
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-orange-700">{result.assigned_agent.name}</span>
        <span className="text-orange-500">{result.confidence}% итгэлтэй</span>
      </div>
      <p className="text-orange-600 mb-2">{result.reasoning}</p>
      <button onClick={confirmAssign} disabled={loading}
        className="bg-orange-600 text-white text-xs font-medium px-3 py-1 rounded-md hover:bg-orange-700 disabled:opacity-50 transition-colors">
        Баталгаажуулах
      </button>
    </div>
  );
}
