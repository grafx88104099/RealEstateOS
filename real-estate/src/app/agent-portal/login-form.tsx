"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { decodeJWT, ROLE_HOME, AllowedRole } from "@/lib/utils/jwt";

// Зөвхөн оффис болон агент ороход. super_admin /super/login-аар орно.
const ALLOWED_ROLES: AllowedRole[] = ["agent", "tenant_admin"];

export default function AgentPortalLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

    if (!role || !ALLOWED_ROLES.includes(role)) {
      await supabase.auth.signOut();
      if (role === "super_admin") {
        setError("Super admin эрхтэй хэрэглэгч /super/login-аар нэвтэрнэ үү");
      } else {
        setError("Энэ хуудас зөвхөн агент болон оффисын бүртгэлд зориулагдсан");
      }
      setLoading(false);
      return;
    }

    router.push(ROLE_HOME[role]);
    router.refresh();
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Имэйл</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
          placeholder="agent@office.mn"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Нууц үг</label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 pr-14 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700"
          >
            {showPassword ? "Нуух" : "Харах"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-sm px-3 py-2.5">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold py-3 rounded-lg hover:shadow-md hover:shadow-indigo-500/25 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
      >
        {loading ? "Нэвтэрч байна..." : "Нэвтрэх"}
      </button>
    </form>
  );
}
