import { supabaseAdmin } from "@/lib/supabase/admin";
import { StatCard } from "@/components/ui/stat-card";
import Link from "next/link";

export default async function SuperAdminHomePage() {
  const [tenants, listings, users, inquiries] = await Promise.all([
    supabaseAdmin.from("tenants").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("listings").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabaseAdmin.from("users").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("inquiries").select("id", { count: "exact", head: true }),
  ]);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Super Admin</h1>
        <p className="text-sm text-gray-500 mt-1">Системийн ерөнхий хяналтын самбар</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Агентлаг" value={tenants.count ?? 0} />
        <StatCard label="Нийт зар" value={listings.count ?? 0} />
        <StatCard label="Нийт хэрэглэгч" value={users.count ?? 0} />
        <StatCard label="Нийт хүсэлт" value={inquiries.count ?? 0} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/super/tenants" className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <h3 className="font-semibold text-gray-900">Агентлагууд</h3>
          <p className="text-sm text-gray-500 mt-1">Бүх агентлагийн жагсаалт, идэвхжүүлэх/хаах</p>
        </Link>
        <Link href="/super/users" className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <h3 className="font-semibold text-gray-900">Хэрэглэгчид</h3>
          <p className="text-sm text-gray-500 mt-1">Бүх хэрэглэгчийн жагсаалт, role шүүлт</p>
        </Link>
      </div>
    </div>
  );
}
