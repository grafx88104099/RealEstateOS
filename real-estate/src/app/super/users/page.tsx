import { supabaseAdmin } from "@/lib/supabase/admin";

const ROLE_LABELS: Record<string, string> = {
  super_admin:  "Super Admin",
  tenant_admin: "Агентлагийн админ",
  agent:        "Агент",
  seller:       "Худалдагч",
  buyer:        "Худалдан авагч",
};

const ROLE_COLORS: Record<string, string> = {
  super_admin:  "bg-red-50 text-red-700",
  tenant_admin: "bg-purple-50 text-purple-700",
  agent:        "bg-blue-50 text-blue-700",
  seller:       "bg-orange-50 text-orange-700",
  buyer:        "bg-green-50 text-green-700",
};

export default async function SuperUsersPage() {
  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id, email, full_name, role, is_active, created_at, tenant:tenants(name)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Хэрэглэгчид</h1>
        <p className="text-sm text-gray-500 mt-1">{users?.length ?? 0} хэрэглэгч</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Нэр / Имэйл</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Агентлаг</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Эрх</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Огноо</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Төлөв</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users?.map((u) => {
              const tenant = u.tenant as { name: string } | null;
              return (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{u.full_name || "—"}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{tenant?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[u.role] ?? "bg-gray-100 text-gray-600"}`}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(u.created_at).toLocaleDateString("mn-MN")}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      u.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                    }`}>
                      {u.is_active ? "Идэвхтэй" : "Хаагдсан"}
                    </span>
                  </td>
                </tr>
              );
            })}
            {(!users || users.length === 0) && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Хэрэглэгч байхгүй байна</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
