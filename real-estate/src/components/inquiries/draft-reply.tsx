"use client";

import { useState } from "react";

interface DraftReplyProps {
  inquiryId: string;
}

const TONES = [
  { value: "professional", label: "Мэргэжлийн" },
  { value: "friendly", label: "Найрсаг" },
  { value: "brief", label: "Товч" },
] as const;

export function DraftReply({ inquiryId }: DraftReplyProps) {
  const [reply, setReply] = useState("");
  const [tone, setTone] = useState<string>("professional");
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    setVisible(true);
    try {
      const res = await fetch("/api/ai/draft-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiry_id: inquiryId, tone }),
      });
      if (res.ok) {
        const data = await res.json();
        setReply(data.reply);
      }
    } catch {
      setReply("Алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(reply);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!visible) {
    return (
      <button
        onClick={generate}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 px-2.5 py-1 rounded-md transition-colors"
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
        </svg>
        AI хариу бичих
      </button>
    );
  }

  return (
    <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-green-700">AI хариуны ноорог</span>
        <div className="flex items-center gap-1">
          {TONES.map((t) => (
            <button
              key={t.value}
              onClick={() => { setTone(t.value); }}
              className={`text-xs px-2 py-0.5 rounded transition-colors ${
                tone === t.value
                  ? "bg-green-600 text-white"
                  : "bg-white text-green-600 hover:bg-green-100 border border-green-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-4 justify-center text-xs text-green-600">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Хариу бичиж байна...
        </div>
      ) : (
        <>
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={4}
            className="w-full border border-green-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500 mb-2"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={generate}
              className="text-xs text-green-600 hover:text-green-700 font-medium"
            >
              Дахин үүсгэх
            </button>
            <button
              onClick={copyToClipboard}
              className="inline-flex items-center gap-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-md transition-colors"
            >
              {copied ? "Хуулсан!" : "Хуулах"}
            </button>
            <button
              onClick={() => { setVisible(false); setReply(""); }}
              className="text-xs text-gray-400 hover:text-gray-600 ml-auto"
            >
              Хаах
            </button>
          </div>
        </>
      )}
    </div>
  );
}
