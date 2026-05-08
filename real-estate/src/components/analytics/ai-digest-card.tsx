"use client";

import { useState } from "react";

export function AiDigestCard() {
  const [digest, setDigest] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setDigest(data.digest);
        setGeneratedAt(data.generated_at);
      }
    } catch {
      setDigest("Тойм үүсгэхэд алдаа гарлаа.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <h2 className="font-semibold text-gray-900 text-sm">AI Тойм</h2>
          {generatedAt && (
            <span className="text-xs text-gray-400">
              {new Date(generatedAt).toLocaleString("mn-MN")}
            </span>
          )}
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Үүсгэж байна...
            </>
          ) : (
            <>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              {digest ? "Дахин үүсгэх" : "AI тойм үүсгэх"}
            </>
          )}
        </button>
      </div>
      <div className="px-5 py-4">
        {digest ? (
          <div className="prose prose-sm prose-gray max-w-none text-sm text-gray-700 leading-relaxed [&_strong]:text-gray-900 [&_ul]:space-y-1 [&_li]:text-gray-600">
            {digest.split("\n").map((line, i) => {
              if (!line.trim()) return <br key={i} />;
              // Bold text
              const formatted = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
              // Bullet points
              if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
                return (
                  <div key={i} className="flex gap-2 ml-2">
                    <span className="text-purple-400 shrink-0">-</span>
                    <span dangerouslySetInnerHTML={{ __html: formatted.replace(/^[-*]\s*/, "") }} />
                  </div>
                );
              }
              return <p key={i} dangerouslySetInnerHTML={{ __html: formatted }} />;
            })}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-gray-400">AI тойм үүсгэж агентлагийн долоо хоногийн тоймыг харах</p>
            <p className="text-xs text-gray-300 mt-1">Агентуудын гүйцэтгэл, зах зээлийн чиг хандлага, зөвлөмж</p>
          </div>
        )}
      </div>
    </div>
  );
}
