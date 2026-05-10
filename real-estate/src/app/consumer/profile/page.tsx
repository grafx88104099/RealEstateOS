import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import ProfileForm from "./profile-form";

export default async function ConsumerProfilePage() {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data: me } = await supabaseAdmin
    .from("users")
    .select("id, email, full_name, phone, avatar_url")
    .eq("id", session.user.id)
    .single();

  return (
    <div className="p-8 max-w-screen-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/consumer"
          aria-label="Буцах"
          className="flex-shrink-0 w-9 h-9 rounded-full bg-white border border-gray-200 hover:bg-gray-100 flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Хувийн мэдээлэл</h1>
          <p className="text-sm text-gray-500 mt-1">Профайл зураг, нэр, утасны дугаараа засах</p>
        </div>
      </div>

      <ProfileForm
        email={session.user.email ?? ""}
        initialFullName={me?.full_name ?? ""}
        initialPhone={me?.phone ?? ""}
        initialAvatarUrl={me?.avatar_url ?? ""}
      />
    </div>
  );
}
