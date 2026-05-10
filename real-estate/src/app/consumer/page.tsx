import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";

export default async function ConsumerHomePage() {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const userId = session.user.id;

  const [sentInquiries, myListings, activeListings, me] = await Promise.all([
    supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("buyer_id", userId),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("seller_id", userId).is("deleted_at", null),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("seller_id", userId).eq("status", "active").is("deleted_at", null),
    supabaseAdmin.from("users").select("full_name, phone, avatar_url").eq("id", userId).maybeSingle(),
  ]);

  const myListingsCount = myListings.count ?? 0;
  const activeListingsCount = activeListings.count ?? 0;
  const sentInquiriesCount = sentInquiries.count ?? 0;
  const fullName = me.data?.full_name ?? "";
  const phone = me.data?.phone ?? "";
  const avatarUrl = me.data?.avatar_url ?? "";
  const displayName = fullName.trim() || (session.user.email ?? "").split("@")[0];

  return (
    <div className="p-8 max-w-screen-xl mx-auto">
      {/* Хувийн мэдээллийн карт */}
      <Link
        href="/consumer/profile"
        className="group mb-6 flex items-center gap-4 bg-white rounded-2xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-500/5 transition-all"
      >
        <div className="flex-shrink-0 w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-indigo-100 to-violet-100 ring-2 ring-white shadow-sm flex items-center justify-center text-indigo-400">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-gray-900 truncate">
            Сайн байна уу, {displayName}!
          </h1>
          <p className="text-sm text-gray-500 mt-0.5 truncate">
            {session.user.email}
            {phone ? ` · ${phone}` : ""}
          </p>
        </div>
        <span className="hidden sm:inline-flex flex-shrink-0 items-center gap-1 text-sm font-medium text-indigo-600 group-hover:gap-2 transition-all">
          Засах
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </Link>

      {/* Үндсэн үйлдлийн карт-ууд: Зарна / Авна */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/consumer/my-listings"
          className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-6 transition-all hover:shadow-lg hover:shadow-indigo-500/10 hover:border-indigo-300"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8m-4-4h8M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-900">Зарна</h3>
              <p className="text-sm text-gray-600 mt-1">
                Үл хөдлөх хөрөнгөө зарлах — зураг, мэдээлэл оруулж шууд нийтэлнэ.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="bg-white/70 backdrop-blur-sm border border-indigo-100 rounded-xl px-3 py-2.5">
              <p className="text-[11px] text-gray-500 uppercase tracking-wide font-medium">Миний зарууд</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{myListingsCount}</p>
            </div>
            <div className="bg-white/70 backdrop-blur-sm border border-indigo-100 rounded-xl px-3 py-2.5">
              <p className="text-[11px] text-gray-500 uppercase tracking-wide font-medium">Идэвхтэй</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{activeListingsCount}</p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 mt-4 text-sm font-semibold text-indigo-600 group-hover:gap-2 transition-all">
            Миний зарууд
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </Link>

        <Link
          href="/consumer/search"
          className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6 transition-all hover:shadow-lg hover:shadow-emerald-500/10 hover:border-emerald-300"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/30">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-900">Авна</h3>
              <p className="text-sm text-gray-600 mt-1">
                Хайлт, шүүлтүүр, AI зөвлөгчтэй өөрт тохирох орон сууцаа сонгоорой.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3">
            <div className="bg-white/70 backdrop-blur-sm border border-emerald-100 rounded-xl px-3 py-2.5">
              <p className="text-[11px] text-gray-500 uppercase tracking-wide font-medium">Илгээсэн хүсэлт</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{sentInquiriesCount}</p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 mt-4 text-sm font-semibold text-emerald-600 group-hover:gap-2 transition-all">
            Зар хайх
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </Link>
      </div>
    </div>
  );
}
