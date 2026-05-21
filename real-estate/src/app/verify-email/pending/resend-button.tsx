"use client";

import { useState } from "react";

export default function ResendVerifyButton() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function handleClick() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Алдаа гарлаа");
      setMsg({ kind: "ok", text: "Шинэ холбоос илгээгдлээ. Имэйлээ шалгана уу." });
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Алдаа" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold py-2.5 px-5 rounded-lg hover:shadow-md hover:shadow-indigo-500/25 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
      >
        {loading ? "Илгээж байна..." : "Холбоос дахин илгээх"}
      </button>
      {msg && (
        <p
          className={`mt-3 text-xs ${
            msg.kind === "ok" ? "text-emerald-700" : "text-rose-600"
          }`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
