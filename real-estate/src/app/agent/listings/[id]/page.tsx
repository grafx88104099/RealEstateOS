import { createSupabaseServer } from "@/lib/supabase/server";
import { decodeJWT } from "@/lib/utils/jwt";
import { STATUS_LABELS, STATUS_COLORS, PROPERTY_TYPE_LABELS, LISTING_TYPE_LABELS } from "@/lib/constants/listings";
import DeleteListingButton from "@/components/listings/delete-button";
import Link from "next/link";
import { notFound } from "next/navigation";

function formatPrice(p: number) {
  if (p >= 1_000_000_000) return `${(p / 1_000_000_000).toFixed(1)} тэрбум₮`;
  if (p >= 1_000_000) return `${(p / 1_000_000).toFixed(0)} сая₮`;
  return `${p.toLocaleString()}₮`;
}

export default async function AgentListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const payload = decodeJWT(session.access_token);
  const userId = session.user.id;

  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!listing) notFound();

  const isOwner = listing.agent_id === userId;

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/agent/listings" className="text-sm text-gray-500 hover:text-gray-700">← Зарууд</Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{listing.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[listing.status] ?? "bg-gray-100"}`}>
              {STATUS_LABELS[listing.status] ?? listing.status}
            </span>
            {!isOwner && (
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Өөр агентын зар</span>
            )}
          </div>
        </div>
        {isOwner && <DeleteListingButton id={listing.id} />}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Үнэ</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatPrice(listing.price)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Талбай</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{listing.area_sqm ? `${listing.area_sqm} м²` : "—"}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3 mb-4">
        {[
          ["Өрөөний тоо", listing.rooms ? `${listing.rooms} өрөө` : "—"],
          ["Дүүрэг", listing.district ?? "—"],
          ["Хаяг", listing.address ?? "—"],
          ["Төрөл", PROPERTY_TYPE_LABELS[listing.property_type] ?? listing.property_type],
          ["Зарах / Түрээслэх", LISTING_TYPE_LABELS[listing.listing_type] ?? listing.listing_type],
          ["Давхар", listing.floor && listing.total_floors ? `${listing.floor}/${listing.total_floors}` : "—"],
          ["Embedding", listing.embedding_updated_at ? "✓ Хийгдсэн" : "⏳ Хийгдэж байна..."],
        ].map(([label, val]) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{label}</span>
            <span className="text-gray-900 font-medium">{val}</span>
          </div>
        ))}
      </div>

      {listing.description && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-700 mb-2">Тайлбар</p>
          <p className="text-sm text-gray-600 leading-relaxed">{listing.description}</p>
        </div>
      )}
    </div>
  );
}
