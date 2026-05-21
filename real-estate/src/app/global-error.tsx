"use client";
// Root error boundary — server component throw үед энэ харагдана.
// global-error.tsx-д HTML тагаа өөрөө байх ёстой (root layout аль хэдийн алдсан).

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(JSON.stringify({
      ts: new Date().toISOString(),
      level: "error",
      event: "client.global_error",
      digest: error.digest,
      message: error.message,
    }));
  }, [error]);

  return (
    <html lang="mn">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f5f5f7" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "1rem" }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "2rem", maxWidth: "420px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", textAlign: "center" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>⚠️</div>
            <h1 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 8px", color: "#111827" }}>
              Алдаа гарлаа
            </h1>
            <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 24px", lineHeight: 1.6 }}>
              Системд гэнэтийн алдаа гарлаа. Манай баг шалгаж байна.
            </p>
            <button
              onClick={reset}
              style={{ background: "linear-gradient(90deg,#4f46e5,#7c3aed)", color: "white", border: "none", padding: "10px 20px", borderRadius: "10px", fontWeight: 600, cursor: "pointer", fontSize: "14px" }}
            >
              Дахин оролдох
            </button>
            {error.digest && (
              <p style={{ fontSize: "11px", color: "#9ca3af", marginTop: "16px", fontFamily: "monospace" }}>
                Error ID: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
