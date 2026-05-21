"use client";

import { useState, Suspense } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { decodeJWT, ROLE_HOME, AllowedRole } from "@/lib/utils/jwt";
import GoogleButton from "@/components/auth/google-button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(urlError);
  const [loading, setLoading] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/consumer");
      router.refresh();
      return;
    }

    const payload = decodeJWT(session.access_token);
    const role = payload.user_role as AllowedRole | undefined;

    // /login нь зөвхөн consumer (энгийн хэрэглэгч)-д. Бусад role-той имэйл бол
    // sign out хийгээд тохирох мэдэгдэл харуулна.
    if (role && role !== "consumer") {
      await supabase.auth.signOut();
      const labels: Record<string, string> = {
        agent: "оффисын агент",
        tenant_admin: "оффисын админ",
        super_admin: "системийн админ",
      };
      const label = labels[role] ?? role;
      const portal = role === "super_admin" ? "/super/login" : "/agent-portal";
      setError(
        `Энэ имэйл хаягаар ${label}-ийн бүртгэлтэй байна. Энгийн хэрэглэгчээр нэвтрэхийн тулд өөр имэйлээр бүртгэл үүсгэнэ үү. Хэрэв та ${label} мөн бол ${portal} дээр нэвтэрнэ үү.`
      );
      setLoading(false);
      return;
    }

    const home = role && ROLE_HOME[role] ? ROLE_HOME[role] : "/consumer";
    router.push(home);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Нэвтрэх</h1>
          <p className="font-[family-name:var(--font-onest)] text-base font-extrabold text-gray-700 mt-1 tracking-tight lowercase">nemi</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Имэйл
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Нууц үг
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Нэвтэрч байна..." : "Нэвтрэх"}
          </button>

          <div className="text-center">
            <Link href="/auth/forgot-password" className="text-xs text-gray-500 hover:text-indigo-600">
              Нууц үгээ мартсан уу?
            </Link>
          </div>
        </form>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">эсвэл</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <GoogleButton label="Google-ээр нэвтрэх" />

        <p className="text-sm text-gray-500 text-center mt-6">
          Бүртгэл байхгүй юу?{" "}
          <Link href="/register?mode=consumer" className="text-blue-600 hover:underline font-medium">
            Бүртгүүлэх
          </Link>
        </p>
        <p className="text-sm text-gray-400 text-center mt-3">
          Агент уу?{" "}
          <Link href="/agent-portal" className="text-gray-600 hover:underline">
            Агентын нэвтрэлт →
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
