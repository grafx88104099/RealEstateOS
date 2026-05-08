import { createSupabaseServer } from "@/lib/supabase/server";
import { PROPERTY_TYPE_LABELS } from "@/lib/constants/listings";
import Link from "next/link";

const STATUS_LABELS: Record<string, string> = {
  active: "Идэвхтэй", draft: "Ноорог", sold: "Зарагдсан",
  rented: "Түрээслэгдсэн", archived: "Архивласан",
};

function formatPrice(p: number) {
  if (p >= 1_000_000_000) return `${(p / 1_000_000_000).toFixed(1)} тэрбум₮`;
  if (p >= 1_000_000) return `${(p / 1_000_000).toFixed(0)} сая₮`;
  return `${p.toLocaleString()}₮`;
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const params = await searchParams;
  const ids = params.ids?.split(",").filter(Boolean) ?? [];

  if (ids.length < 2) {
    return (
      <div className="p-8">
        <Link href="/dashboard/listings" className="text-sm text-gray-500 hover:text-gray-700">← Зарууд</Link>
        <div className="mt-8 text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-400 text-sm">Харьцуулахын тулд 2-4 зар сонгоно уу</p>
          <p className="text-xs text-gray-300 mt-1">Зарууд хуудаснаас checkbox-оор сонгоод "Харьцуулах" товч дарна</p>
        </div>
      </div>
    );
  }

  const supabase = await createSupabaseServer();
  const { data: listings } = await supabase
    .from("listings")
    .select("id, title, description, price, rooms, area_sqm, floor, total_floors, district, address, property_type, listing_type, status, created_at, agent:users!agent_id(full_name)")
    .in("id", ids)
    .is("deleted_at", null);

  const items = listings ?? [];

  // Find best/worst values
  const prices = items.map((l) => Number(l.price));
  const areas = items.map((l) => Number(l.area_sqm ?? 0));
  const minPrice = Math.min(...prices);
  const maxArea = Math.max(...areas);

  const rows: { label: string; key: string; render: (l: typeof items[0]) => string; highlight?: (l: typeof items[0]) => string }[] = [
    { label: "Үнэ", key: "price", render: (l) => formatPrice(Number(l.price)), highlight: (l) => Number(l.price) === minPrice ? "text-green-600 font-bold" : "" },
    { label: "Талбай", key: "area", render: (l) => l.area_sqm ? `${l.area_sqm} м²` : "—", highlight: (l) => Number(l.area_sqm ?? 0) === maxArea && maxArea > 0 ? "text-green-600 font-bold" : "" },
    { label: "м² үнэ", key: "ppm", render: (l) => l.area_sqm && Number(l.area_sqm) > 0 ? formatPrice(Math.round(Number(l.price) / Number(l.area_sqm))) : "—" },
    { label: "Өрөө", key: "rooms", render: (l) => l.rooms ? String(l.rooms) : "—" },
    { label: "Давхар", key: "floor", render: (l) => l.floor && l.total_floors ? `${l.floor}/${l.total_floors}` : "—" },
    { label: "Дүүрэг", key: "district", render: (l) => l.district ?? "—" },
    { label: "Хаяг", key: "address", render: (l) => l.address ?? "—" },
    { label: "Төрөл", key: "type", render: (l) => PROPERTY_TYPE_LABELS[l.property_type] ?? l.property_type },
    { label: "Статус", key: "status", render: (l) => STATUS_LABELS[l.status] ?? l.status },
    { label: "Агент", key: "agent", render: (l) => (l.agent as { full_name: string | null } | null)?.full_name ?? "—" },
    { label: "Нийтлэгдсэн", key: "date", render: (l) => new Date(l.created_at).toLocaleDateString("mn-MN") },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Зар харьцуулалт</h1>
          <p className="text-sm text-gray-500 mt-1">{items.length} зар харьцуулж байна</p>
        </div>
        <Link href="/dashboard/listings" className="text-sm text-gray-500 hover:text-gray-700">← Зарууд руу буцах</Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase w-32">Шалгуур</th>
              {items.map((l) => (
                <th key={l.id} className="text-left px-4 py-3 min-w-[200px]">
                  <Link href={`/dashboard/listings/${l.id}`} className="text-sm font-semibold text-gray-900 hover:text-blue-600">
                    {l.title}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.key} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-xs font-medium text-gray-500">{row.label}</td>
                {items.map((l) => (
                  <td key={l.id} className={`px-4 py-3 text-gray-900 ${row.highlight?.(l) ?? ""}`}>
                    {row.render(l)}
                  </td>
                ))}
              </tr>
            ))}
            {/* Description row */}
            <tr className="hover:bg-gray-50">
              <td className="px-4 py-3 text-xs font-medium text-gray-500 align-top">Тайлбар</td>
              {items.map((l) => (
                <td key={l.id} className="px-4 py-3 text-xs text-gray-500 max-w-[250px]">
                  {l.description ? l.description.slice(0, 150) + (l.description.length > 150 ? "..." : "") : "—"}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
