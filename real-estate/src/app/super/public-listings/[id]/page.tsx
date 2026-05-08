import Link from "next/link";
import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin as typedAdmin } from "@/lib/supabase/admin";
import { StatusBadge } from "@/components/super/public-listings/status-badge";
import { ListingRowActions } from "@/components/super/public-listings/listing-row-actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAdmin = typedAdmin as unknown as SupabaseClient<any, any, any>;

export const dynamic = "force-dynamic";

const fmt = new Intl.NumberFormat("mn-MN");

export default async function PublicListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: listing } = await supabaseAdmin
    .from("listings")
    .select(
      `id, title, description, price, rooms, area_sqm, floor, total_floors,
       district, address, lat, lng, property_type, listing_type, status,
       featured, view_count, moderation_notes, moderation_reviewed_at,
       rejected_reason, created_at, published_at, deleted_at,
       tenant:tenants(id, name, requires_listing_review),
       agent:users!agent_id(id, full_name, email)`,
    )
    .eq("id", id)
    .single();

  type ListingRow = {
    id: string;
    title: string;
    description: string | null;
    price: number | null;
    rooms: number | null;
    area_sqm: number | null;
    floor: number | null;
    total_floors: number | null;
    district: string | null;
    address: string | null;
    lat: number | null;
    lng: number | null;
    property_type: string | null;
    listing_type: string | null;
    status: string;
    featured: boolean;
    view_count: number;
    moderation_notes: string | null;
    moderation_reviewed_at: string | null;
    rejected_reason: string | null;
    created_at: string;
    published_at: string | null;
    deleted_at: string | null;
    tenant: { id: string; name: string; requires_listing_review: boolean } | null;
    agent: { id: string; full_name: string | null; email: string } | null;
  };
  const l = listing as ListingRow | null;
  if (!l) notFound();

  const [imgs, inq, off, viw, evts] = await Promise.all([
    supabaseAdmin
      .from("listing_images")
      .select("id, url, is_cover, sort_order")
      .eq("listing_id", id)
      .order("sort_order", { ascending: true }),
    supabaseAdmin.from("inquiries").select("id", { count: "exact", head: true }).eq("listing_id", id),
    supabaseAdmin.from("offers").select("id", { count: "exact", head: true }).eq("listing_id", id),
    supabaseAdmin.from("viewings").select("id", { count: "exact", head: true }).eq("listing_id", id),
    supabaseAdmin
      .from("listing_events")
      .select(
        `id, event_type, from_status, to_status, payload, created_at,
         actor:users!actor_id(full_name, email)`,
      )
      .eq("listing_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  type ImageRow = { id: string; url: string; is_cover: boolean; sort_order: number };
  type EventRow = {
    id: string;
    event_type: string;
    from_status: string | null;
    to_status: string | null;
    payload: Record<string, unknown> | null;
    created_at: string;
    actor: { full_name: string | null; email: string } | null;
  };
  const images = (imgs.data as ImageRow[] | null) ?? [];
  const events = (evts.data as EventRow[] | null) ?? [];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/super/public-listings/all"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Бүх зар руу
        </Link>
        <ListingRowActions id={l.id} status={l.status} isDeleted={!!l.deleted_at} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: gallery + body */}
        <div className="lg:col-span-2 space-y-6">
          {images.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {images.slice(0, 4).map((img) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={img.id}
                  src={img.url}
                  alt=""
                  className="w-full h-48 object-cover rounded-lg bg-gray-100"
                />
              ))}
            </div>
          ) : (
            <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
              Зураг байхгүй
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-3">
              <h1 className="text-xl font-bold text-gray-900 flex-1">{l.title}</h1>
              <div className="flex gap-2">
                <StatusBadge status={l.status} />
                {l.featured && (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                    Онцлох
                  </span>
                )}
                {l.deleted_at && (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-600">
                    Устгасан
                  </span>
                )}
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {l.price != null ? `₮${fmt.format(l.price)}` : "—"}
            </div>
            <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <Field label="Дүүрэг" value={l.district} />
              <Field label="Өрөө" value={l.rooms?.toString()} />
              <Field label="Талбай (м²)" value={l.area_sqm?.toString()} />
              <Field
                label="Давхар"
                value={l.floor && l.total_floors ? `${l.floor}/${l.total_floors}` : null}
              />
              <Field label="Хөрөнгийн төрөл" value={l.property_type} />
              <Field label="Зарын төрөл" value={l.listing_type} />
              <Field label="Хаяг" value={l.address} />
              <Field
                label="Координат"
                value={l.lat && l.lng ? `${l.lat.toFixed(4)}, ${l.lng.toFixed(4)}` : null}
              />
            </dl>
            {l.description && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Тайлбар</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{l.description}</p>
              </div>
            )}
            {l.rejected_reason && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <h3 className="text-sm font-semibold text-red-700 mb-1">
                  Татгалзсан шалтгаан
                </h3>
                <p className="text-sm text-red-600">{l.rejected_reason}</p>
              </div>
            )}
            {l.moderation_notes && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <h3 className="text-sm font-semibold text-yellow-700 mb-1">
                  Хяналтын тэмдэглэл
                </h3>
                <p className="text-sm text-yellow-700">{l.moderation_notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: side panels */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-medium uppercase text-gray-500 mb-2">
              Агентлаг
            </h3>
            {l.tenant ? (
              <div>
                <p className="font-medium text-gray-900">{l.tenant.name}</p>
                {l.tenant.requires_listing_review && (
                  <p className="text-xs text-yellow-600 mt-1">
                    Заавал хяналт идэвхтэй
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">—</p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-medium uppercase text-gray-500 mb-2">Агент</h3>
            {l.agent ? (
              <div>
                <p className="font-medium text-gray-900">
                  {l.agent.full_name ?? "—"}
                </p>
                <p className="text-xs text-gray-500">{l.agent.email}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">—</p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-medium uppercase text-gray-500 mb-2">
              Идэвх (нийт)
            </h3>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Stat label="Үзлэг" value={l.view_count} />
              <Stat label="Хүсэлт" value={inq.count ?? 0} />
              <Stat label="Санал" value={off.count ?? 0} />
              <Stat label="Үзэлт" value={viw.count ?? 0} />
            </dl>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-medium uppercase text-gray-500 mb-2">Огноо</h3>
            <dl className="space-y-1 text-sm">
              <Field
                label="Үүсгэсэн"
                value={new Date(l.created_at).toLocaleString("mn-MN")}
              />
              {l.published_at && (
                <Field
                  label="Нийтэлсэн"
                  value={new Date(l.published_at).toLocaleString("mn-MN")}
                />
              )}
              {l.moderation_reviewed_at && (
                <Field
                  label="Хяналт"
                  value={new Date(l.moderation_reviewed_at).toLocaleString(
                    "mn-MN",
                  )}
                />
              )}
            </dl>
          </div>
        </div>
      </div>

      {/* Audit log */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Үйл ажиллагааны түүх</h2>
        {events.length === 0 ? (
          <p className="text-sm text-gray-500">Үйл ажиллагаа алга байна.</p>
        ) : (
          <ol className="space-y-3 text-sm">
            {events.map((e) => (
              <li key={e.id} className="flex gap-3">
                <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></span>
                <div className="flex-1">
                  <p className="text-gray-900">
                    <span className="font-medium">{e.event_type}</span>
                    {e.from_status && e.to_status && (
                      <span className="text-gray-500">
                        : {e.from_status} → {e.to_status}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {e.actor?.full_name ?? e.actor?.email ?? "—"} ·{" "}
                    {new Date(e.created_at).toLocaleString("mn-MN")}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-gray-900">{value || "—"}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-lg font-semibold text-gray-900">{value}</dd>
    </div>
  );
}
