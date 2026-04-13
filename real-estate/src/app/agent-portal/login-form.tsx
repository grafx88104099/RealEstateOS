"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { decodeJWT, ROLE_HOME, AllowedRole } from "@/lib/utils/jwt";

const ALLOWED_ROLES: AllowedRole[] = ["agent", "tenant_admin", "super_admin"];

export default function AgentPortalLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });

    if (signInErr) {
      setError("Имэйл эсвэл нууц үг буруу байна");
      setLoading(false);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError("Нэвтрэхэд алдаа гарлаа");
      setLoading(false);
      return;
    }

    const payload = decodeJWT(session.access_token);
    const role = payload.user_role as AllowedRole | undefined;

    // Consumer энд нэвтрэх эрхгүй
    if (!role || !ALLOWED_ROLES.includes(role)) {
      await supabase.auth.signOut();
      setError("Энэ хуудас зөвхөн агент болон агентлагийн бүртгэлд зориулагдсан");
      setLoading(false);
      return;
    }

    router.push(ROLE_HOME[role]);
    router.refresh();
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Имэйл</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="agent@agency.mn"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Нууц үг</label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 pr-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
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
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-3 py-2.5">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Нэвтэрч байна..." : "Нэвтрэх"}
      </button>
    </form>
  );
}
