import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function SuperTenantsPage() {
  const { data: tenants } = await supabaseAdmin
    .from("tenants")
    .select("id, name, slug, subscription, is_active, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Агентлагууд</h1>
        <p className="text-sm text-gray-500 mt-1">{tenants?.length ?? 0} агентлаг</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Нэр</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Subscription</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Огноо</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Төлөв</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tenants?.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{t.slug}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    t.subscription === "pro" ? "bg-purple-50 text-purple-700" :
                    t.subscription === "enterprise" ? "bg-blue-50 text-blue-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {t.subscription}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {new Date(t.created_at).toLocaleDateString("mn-MN")}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    t.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                  }`}>
                    {t.is_active ? "Идэвхтэй" : "Хаагдсан"}
                  </span>
                </td>
              </tr>
            ))}
            {(!tenants || tenants.length === 0) && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Агентлаг байхгүй байна</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
