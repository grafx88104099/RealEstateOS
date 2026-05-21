"use client";

import { useEffect } from "react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
  section?: string;
}

export default function ErrorFallback({ error, reset, section }: Props) {
  useEffect(() => {
    console.error(JSON.stringify({
      ts: new Date().toISOString(),
      level: "error",
      event: "client.section_error",
      section: section ?? "unknown",
      digest: error.digest,
      message: error.message,
    }));
  }, [error, section]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-md w-full text-center">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto mb-4 flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Алдаа гарлаа</h2>
        <p className="text-sm text-gray-600 mb-5 leading-relaxed">
          Хуудсыг харуулж чадсангүй. Дахин оролдоно уу.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:shadow-md transition-all"
        >
          Дахин ачаалах
        </button>
        {error.digest && (
          <p className="text-[11px] text-gray-400 mt-4 font-mono">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
