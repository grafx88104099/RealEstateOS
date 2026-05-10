import { createSupabaseServer } from "@/lib/supabase/server";
import InviteUserModal from "./invite-modal";
import { UserActions } from "./user-actions";

const ROLE_LABELS: Record<string, string> = {
  tenant_admin: "Оффисын админ",
  agent: "Агент",
  consumer: "Хэрэглэгч",
};

export default async function UsersPage() {
  const supabase = await createSupabaseServer();

  const { data: users } = await supabase
    .from("users")
    .select("id, email, full_name, role, is_active, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Хэрэглэгчид</h1>
          <p className="text-sm text-gray-500 mt-1">{users?.length ?? 0} хэрэглэгч</p>
        </div>
        <InviteUserModal />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Хэрэглэгч</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Төлөв</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Огноо</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Үйлдэл</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users?.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{u.full_name || "—"}</p>
                  <p className="text-gray-500 text-xs">{u.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                    {ROLE_LABELS[u.role] ?? u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    u.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {u.is_active ? "Идэвхтэй" : "Идэвхгүй"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {new Date(u.created_at).toLocaleDateString("mn-MN")}
                </td>
                <td className="px-4 py-3">
                  {u.role !== "tenant_admin" ? (
                    <UserActions user={u} />
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </td>
              </tr>
            ))}
            {(!users || users.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Хэрэглэгч байхгүй байна
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
