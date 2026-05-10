"use client";

import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

export default function WrongSessionNotice({
  email,
  superAdminLink,
}: {
  email: string;
  superAdminLink?: string;
}) {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  async function handleLogout() {
    await supabase.auth.signOut();
    router.refresh();
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
      <p className="text-sm font-semibold text-amber-900">
        Та super admin эрхээр нэвтэрсэн байна
      </p>
      <p className="text-xs text-amber-700 mt-1">
        {email} · Энэ хуудас зөвхөн оффис болон агентын бүртгэлд зориулагдсан.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={handleLogout}
          className="text-sm font-medium bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 px-4 py-2 rounded-lg transition-colors"
        >
          Гарч өөр бүртгэлээр нэвтрэх
        </button>
        {superAdminLink && (
          <Link
            href={superAdminLink}
            className="text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 px-4 py-2 rounded-lg transition-colors"
          >
            Super admin самбар руу
          </Link>
        )}
      </div>
    </div>
  );
}
