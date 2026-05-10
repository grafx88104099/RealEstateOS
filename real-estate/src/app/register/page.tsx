"use client";

import { useState, useEffect, Suspense } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import GoogleButton from "@/components/auth/google-button";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // /register?mode=agency бол шинэ wizard руу redirect (хуучин URL backward-compatibility)
  const isAgency = searchParams.get("mode") === "agency";
  useEffect(() => {
    if (isAgency) router.replace("/agents/onboard/account");
  }, [isAgency, router]);

  const [form, setForm] = useState({ fullName: "", email: "", password: "", agencyName: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: isAgency ? "agency" : "consumer",
        email: form.email,
        password: form.password,
        full_name: form.fullName,
        agency_name: form.agencyName || undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Бүртгэхэд алдаа гарлаа");
      setLoading(false);
      return;
    }

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    if (signInErr) {
      setError(signInErr.message);
      setLoading(false);
      return;
    }

    router.push(data.redirect);
    router.refresh();
  }

  // ── Consumer бүртгэл ──────────────────────────────────────────────
  if (!isAgency) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="mb-6">
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 mb-4 inline-block">← Нүүр хуудас</Link>
            <h1 className="text-2xl font-bold text-gray-900">Бүртгүүлэх</h1>
            <p className="text-sm text-gray-500 mt-1">Зар хайх болон зарах бүртгэл</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Таны нэр</label>
              <input type="text" value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Батбаяр" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Имэйл</label>
              <input type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="email@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Нууц үг</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required minLength={6}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {loading ? "Бүртгэж байна..." : "Бүртгүүлэх"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">эсвэл</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <GoogleButton label="Google-ээр бүртгүүлэх" />

          <p className="text-sm text-gray-500 text-center mt-6">
            Бүртгэл байгаа юу?{" "}
            <Link href="/login" className="text-blue-600 hover:underline font-medium">Нэвтрэх</Link>
          </p>
        </div>
      </div>
    );
  }

  // ── Agency бүртгэл шинэ /agents/onboard/account руу шилжсэн.
  //    Энд хүрсэн тохиолдолд redirecting placeholder харуулна.
  if (isAgency) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-sm text-gray-500">Оффис нээх хуудас руу шилжүүлж байна…</div>
      </div>
    );
  }

  // ── Хуучин Agency бүртгэл (хэрэглэхгүй, fallback зорилгоор үлдсэн) ────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl border border-white/10 p-8">
        <div className="mb-6">
          <Link href="/agent-portal" className="text-sm text-gray-500 hover:text-gray-300 mb-4 inline-block">← Агентын нүүр</Link>
          <h1 className="text-2xl font-bold text-white">Оффис бүртгүүлэх</h1>
          <p className="text-sm text-gray-400 mt-1">Шинэ оффисын бүртгэл</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Оффисын нэр</label>
            <input type="text" value={form.agencyName}
              onChange={(e) => setForm({ ...form, agencyName: e.target.value })}
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="МН Үл хөдлөх" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Таны нэр</label>
            <input type="text" value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Батбаяр" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Имэйл</label>
            <input type="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="admin@agency.mn" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Нууц үг</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required minLength={6}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 pr-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••" />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300" tabIndex={-1}>
                <EyeIcon open={showPassword} dark />
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-3 py-2.5">{error}</div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? "Бүртгэж байна..." : "Оффис бүртгүүлэх"}
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-6">
          Бүртгэл байгаа юу?{" "}
          <Link href="/agent-portal" className="text-gray-300 hover:underline font-medium">Нэвтрэх</Link>
        </p>
      </div>
    </div>
  );
}

function EyeIcon({ open, dark }: { open: boolean; dark?: boolean }) {
  const cls = `w-4 h-4 ${dark ? "text-gray-500" : "text-gray-400"}`;
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

export default function RegisterPage() {
  return <Suspense><RegisterForm /></Suspense>;
}
