import { createSupabaseServer } from "@/lib/supabase/server";
import { PROPERTY_TYPE_LABELS } from "@/lib/constants/listings";
import { ListingFilters } from "@/components/listings/listing-filters";
import { ListingsView } from "@/components/listings/listings-view";
import { decodeJWT } from "@/lib/utils/jwt";
import Link from "next/link";

const STATUS_LABELS: Record<string, string> = {
  active: "Идэвхтэй",
  draft: "Ноорог",
  pending_review: "Хянагдаж байна",
  sold: "Зарагдсан",
  rented: "Түрээслэгдсэн",
  expired: "Хугацаа дууссан",
  archived: "Архивласан",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  draft: "bg-gray-100 text-gray-600",
  pending_review: "bg-yellow-100 text-yellow-700",
  sold: "bg-blue-100 text-blue-700",
  rented: "bg-blue-100 text-blue-700",
  expired: "bg-red-100 text-red-600",
  archived: "bg-red-100 text-red-600",
};

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string; type?: string; q?: string; sort?: string;
    minPrice?: string; maxPrice?: string; rooms?: string; agent?: string;
  }>;
}) {
  const params = await searchParams;
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  const payload = session ? decodeJWT(session.access_token) : null;
  const tenantId = payload?.tenant_id as string | undefined;

  let query = supabase
    .from("listings")
    .select("id, title, status, price, rooms, area_sqm, district, property_type, created_at, agent_id, agent:users!agent_id(full_name)")
    .is("deleted_at", null);

  // Status filter
  if (params.status) query = query.eq("status", params.status as never);
  if (params.type) query = query.eq("property_type", params.type as never);
  if (params.agent) query = query.eq("agent_id", params.agent as never);

  // Sorting
  switch (params.sort) {
    case "price_asc": query = query.order("price", { ascending: true }); break;
    case "price_desc": query = query.order("price", { ascending: false }); break;
    case "area_desc": query = query.order("area_sqm", { ascending: false }); break;
    case "rooms_desc": query = query.order("rooms", { ascending: false }); break;
    case "oldest": query = query.order("created_at", { ascending: true }); break;
    default: query = query.order("created_at", { ascending: false });
  }

  const { data: listings, error } = await query;

  // Client-side filters
  let filtered = listings ?? [];

  // Text search
  if (params.q) {
    const q = params.q.toLowerCase();
    filtered = filtered.filter((l) =>
      l.title?.toLowerCase().includes(q) || l.district?.toLowerCase().includes(q)
    );
  }

  // Price range
  if (params.minPrice) {
    const min = Number(params.minPrice);
    filtered = filtered.filter((l) => Number(l.price) >= min);
  }
  if (params.maxPrice) {
    const max = Number(params.maxPrice);
    filtered = filtered.filter((l) => Number(l.price) <= max);
  }

  // Rooms
  if (params.rooms) {
    const minRooms = Number(params.rooms);
    filtered = filtered.filter((l) => (l.rooms ?? 0) >= minRooms);
  }

  // Status counts
  const statusCounts: Record<string, number> = {};
  for (const l of listings ?? []) {
    statusCounts[l.status] = (statusCounts[l.status] ?? 0) + 1;
  }

  // Get agents list for filter
  let agents: { id: string; name: string }[] = [];
  if (tenantId) {
    const { data: agentData } = await supabase
      .from("users")
      .select("id, full_name")
      .eq("tenant_id", tenantId)
      .eq("role", "agent")
      .eq("is_active", true)
      .is("deleted_at", null);
    agents = (agentData ?? []).map((a) => ({ id: a.id, name: a.full_name || a.id.slice(0, 8) }));
  }

  const viewListings = filtered.map((l) => ({
    id: l.id,
    title: l.title,
    status: l.status,
    price: Number(l.price),
    rooms: l.rooms,
    area_sqm: l.area_sqm ? Number(l.area_sqm) : null,
    district: l.district,
    property_type: l.property_type,
    created_at: l.created_at,
    agent_name: (l.agent as { full_name: string | null } | null)?.full_name ?? null,
  }));

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Зарууд</h1>
          <p className="text-sm text-gray-500 mt-1">{filtered.length} зар {params.q ? `"${params.q}" хайлтаар` : ""}</p>
        </div>
        <Link href="/dashboard/listings/new"
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          + Шинэ зар
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-lg p-4 mb-4">{error.message}</div>
      )}

      {/* Status tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          <Link href="/dashboard/listings"
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${!params.status ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            Бүгд ({listings?.length ?? 0})
          </Link>
          {Object.entries(STATUS_LABELS).map(([value, label]) => {
            const count = statusCounts[value] ?? 0;
            if (count === 0 && value !== params.status) return null;
            return (
              <Link key={value} href={`/dashboard/listings?status=${value}`}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${params.status === value ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {label} ({count})
              </Link>
            );
          })}
        </div>
      </div>

      {/* Advanced filters */}
      <div className="mb-4">
        <ListingFilters
          currentType={params.type}
          currentQuery={params.q}
          currentSort={params.sort}
          currentMinPrice={params.minPrice}
          currentMaxPrice={params.maxPrice}
          currentRooms={params.rooms}
          currentAgent={params.agent}
          propertyTypes={PROPERTY_TYPE_LABELS}
          agents={agents}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm">Зар олдсонгүй</p>
          <Link href="/dashboard/listings/new" className="mt-4 inline-block text-blue-600 text-sm hover:underline">Шинэ зар нэмэх</Link>
        </div>
      ) : (
        <ListingsView
          listings={viewListings}
          statusLabels={STATUS_LABELS}
          statusColors={STATUS_COLORS}
          propertyTypeLabels={PROPERTY_TYPE_LABELS}
        />
      )}
    </div>
  );
}
