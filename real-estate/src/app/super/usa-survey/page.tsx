import { supabaseAdmin } from "@/lib/supabase/admin";
import QRManager from "@/components/super/qr-manager";

type SurveyResponse = {
  id: string;
  last_name: string;
  first_name: string;
  phone: string | null;
  email: string | null;
  us_state: string | null;
  contact_time: string | null;
  contact_method: string[];
  property_type: string[];
  property_location: string[];
  property_purpose: string[];
  budget: string | null;
  urgency: string | null;
  financing: string | null;
  prev_property: string | null;
  notes: string | null;
  hear_about: string[];
  created_at: string;
};

function Badge({ text, color = "gray" }: { text: string; color?: string }) {
  const colors: Record<string, string> = {
    gray: "bg-gray-100 text-gray-600",
    amber: "bg-amber-100 text-amber-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.gray}`}>
      {text}
    </span>
  );
}

function urgencyColor(u: string | null): string {
  if (!u) return "gray";
  if (u.includes("Яаралтай")) return "red";
  if (u.includes("Дунд")) return "amber";
  if (u.includes("Тайван")) return "green";
  return "gray";
}

export default async function USASurveyPage() {
  const [{ data: responses, count }, { data: qrLink }] = await Promise.all([
    supabaseAdmin
      .from("survey_responses")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(100),
    supabaseAdmin
      .from("qr_links")
      .select("slug, target_url, scan_count")
      .eq("slug", "usa-survey")
      .single(),
  ]);

  const items = (responses as SurveyResponse[]) || [];
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // Stats
  const budgetCounts: Record<string, number> = {};
  const urgencyCounts: Record<string, number> = {};
  const stateCounts: Record<string, number> = {};
  const propTypeCounts: Record<string, number> = {};

  for (const r of items) {
    if (r.budget) budgetCounts[r.budget] = (budgetCounts[r.budget] || 0) + 1;
    if (r.urgency) urgencyCounts[r.urgency] = (urgencyCounts[r.urgency] || 0) + 1;
    if (r.us_state) stateCounts[r.us_state] = (stateCounts[r.us_state] || 0) + 1;
    for (const t of r.property_type) {
      propTypeCounts[t] = (propTypeCounts[t] || 0) + 1;
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">USAsurvey</h1>
          <p className="text-sm text-gray-500 mt-1">USA-д амьдарч буй монголчуудын судалгааны үр дүн</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-gray-900">{count ?? items.length}</p>
          <p className="text-xs text-gray-500">Нийт хариулт</p>
        </div>
      </div>

      {/* QR Code Manager */}
      {qrLink && (
        <QRManager
          link={{
            slug: qrLink.slug,
            target_url: qrLink.target_url,
            scan_count: qrLink.scan_count,
            base_url: baseUrl,
          }}
        />
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {/* Budget breakdown */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Төсвийн хүрээ</h3>
          <div className="space-y-2">
            {Object.entries(budgetCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="text-gray-600">{k}</span>
                <span className="font-medium text-gray-900">{v}</span>
              </div>
            ))}
            {Object.keys(budgetCounts).length === 0 && <p className="text-xs text-gray-400">Мэдээлэл байхгүй</p>}
          </div>
        </div>

        {/* Urgency */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Яаралтай байдал</h3>
          <div className="space-y-2">
            {Object.entries(urgencyCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="text-gray-600">{k}</span>
                <span className="font-medium text-gray-900">{v}</span>
              </div>
            ))}
            {Object.keys(urgencyCounts).length === 0 && <p className="text-xs text-gray-400">Мэдээлэл байхгүй</p>}
          </div>
        </div>

        {/* US States */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Мужуудаар</h3>
          <div className="space-y-2">
            {Object.entries(stateCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="text-gray-600">{k}</span>
                <span className="font-medium text-gray-900">{v}</span>
              </div>
            ))}
            {Object.keys(stateCounts).length === 0 && <p className="text-xs text-gray-400">Мэдээлэл байхгүй</p>}
          </div>
        </div>

        {/* Property type */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">ҮХХ төрөл</h3>
          <div className="space-y-2">
            {Object.entries(propTypeCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="text-gray-600">{k}</span>
                <span className="font-medium text-gray-900">{v}</span>
              </div>
            ))}
            {Object.keys(propTypeCounts).length === 0 && <p className="text-xs text-gray-400">Мэдээлэл байхгүй</p>}
          </div>
        </div>
      </div>

      {/* Responses table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-medium text-gray-900">Бүх хариултууд</h3>
        </div>
        {items.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-gray-400">
            Одоогоор судалгааны хариулт байхгүй байна.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Нэр</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Холбоо барих</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Муж</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">ҮХХ төрөл</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Байршил</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Төсөв</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Яаралтай</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Огноо</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{r.last_name} {r.first_name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-600 text-xs">{r.phone || "—"}</div>
                      <div className="text-gray-400 text-xs">{r.email || "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.us_state || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {r.property_type.map((t) => <Badge key={t} text={t} color="blue" />)}
                        {r.property_type.length === 0 && <span className="text-gray-400">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {r.property_location.map((l) => <Badge key={l} text={l} />)}
                        {r.property_location.length === 0 && <span className="text-gray-400">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {r.budget ? <Badge text={r.budget} color="amber" /> : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {r.urgency ? <Badge text={r.urgency} color={urgencyColor(r.urgency)} /> : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString("mn-MN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
