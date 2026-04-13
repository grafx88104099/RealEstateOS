"use client";

// /auth/set-password
// Invite холбоосоор ирсэн агент нүүц үгээ тохируулах хуудас
// URL-д #access_token=...&refresh_token=... байна (Supabase implicit flow)

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { decodeJWT, ROLE_HOME, AllowedRole } from "@/lib/utils/jwt";

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    // Hash fragment-аас token уншиж session тогтоох
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) {
      setError("Урилгын холбоос буруу байна. Шинэ урилга авна уу.");
      return;
    }

    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          setError("Урилгын холбоосын хугацаа дууссан байна. Шинэ урилга авна уу.");
        } else {
          setSessionReady(true);
          // Hash-ийг URL-аас цэвэрлэх
          window.history.replaceState(null, "", window.location.pathname);
        }
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Нууц үг таарахгүй байна");
      return;
    }
    if (password.length < 6) {
      setError("Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой");
      return;
    }

    setLoading(true);
    setError(null);

    const { error: updateErr } = await supabase.auth.updateUser({ password });
    if (updateErr) {
      setError(updateErr.message);
      setLoading(false);
      return;
    }

    // Role-оор redirect
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const payload = decodeJWT(session.access_token);
      const role = payload.user_role as AllowedRole | undefined;
      const home = role && ROLE_HOME[role] ? ROLE_HOME[role] : "/agent";
      router.push(home);
    } else {
      router.push("/agent-portal");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl border border-white/10 p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Нууц үг тохируулах</h1>
          <p className="text-sm text-gray-400 mt-1">Агентын бүртгэл идэвхжүүлэх</p>
        </div>

        {error && !sessionReady ? (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        ) : sessionReady ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Шинэ нууц үг</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required minLength={6}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 pr-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300" tabIndex={-1}>
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
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Нууц үг давтах</label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required minLength={6}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-3 py-2.5">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {loading ? "Хадгалж байна..." : "Нууц үг тохируулж нэвтрэх"}
            </button>
          </form>
        ) : (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
