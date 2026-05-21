import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { decodeJWT } from "@/lib/utils/jwt";
import InquiryForm from "@/components/listings/inquiry-form";
import { PROPERTY_TYPE_LABELS, LISTING_TYPE_LABELS } from "@/lib/constants/listings";
import { ListingImageCarousel } from "@/components/listings/listing-image-carousel";

// SEO: per-listing OpenGraph metadata
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: l } = await (supabaseAdmin as any)
    .from("listings")
    .select("title, description, price, district, address, property_type")
    .eq("id", id)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  if (!l) return { title: "Зар олдсонгүй" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: img } = await (supabaseAdmin as any)
    .from("listing_images")
    .select("url")
    .eq("listing_id", id)
    .is("deleted_at", null)
    .order("is_cover", { ascending: false })
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  const priceStr =
    l.price >= 1_000_000_000
      ? `${(l.price / 1_000_000_000).toFixed(1)} тэрбум`
      : l.price >= 1_000_000
      ? `${(l.price / 1_000_000).toFixed(1)} сая`
      : l.price.toLocaleString("mn-MN");

  const title = `${l.title} — ₮${priceStr}`;
  const description =
    (l.description ?? "").slice(0, 200) ||
    `${PROPERTY_TYPE_LABELS[l.property_type] ?? ""} ${l.district ?? ""} ${l.address ?? ""}`.trim();

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: img?.url ? [{ url: img.url }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: img?.url ? [img.url] : undefined,
    },
  };
}

function formatPrice(price: number) {
  if (price >= 1_000_000_000) return `${(price / 1_000_000_000).toFixed(2)} тэрбум`;
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(1)} сая`;
  return price.toLocaleString("mn-MN");
}

interface Listing {
  id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | null;
  floor: number | null;
  total_floors: number | null;
  built_year: number | null;
  has_parking: boolean;
  is_furnished: boolean;
  property_type: string;
  listing_type: string;
  district: string | null;
  address: string | null;
  city: string;
  created_at: string;
  agent: { id: string; full_name: string | null; email: string } | null;
}

interface ListingImage {
  id: string;
  url: string;
  is_cover: boolean;
  sort_order: number;
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  const role = session ? (decodeJWT(session.access_token).user_role as string) : null;

  // Fetch listing + images in parallel
  const [listingRes, imagesRes] = await Promise.all([
    supabaseAdmin
      .from("listings")
      .select(`
        id, title, description, price, currency,
        rooms, bedrooms, bathrooms, area_sqm, floor, total_floors,
        built_year, has_parking, is_furnished,
        property_type, listing_type, status,
        district, address, city, created_at,
        agent:users!agent_id(id, full_name, email)
      `)
      .eq("id", id)
      .eq("status", "active")
      .is("deleted_at", null)
      .single(),
    supabaseAdmin
      .from("listing_images")
      .select("id, url, is_cover, sort_order")
      .eq("listing_id", id)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true }),
  ]);

  if (listingRes.error || !listingRes.data) notFound();

  const listing = listingRes.data as unknown as Listing;
  const images = (imagesRes.data ?? []) as ListingImage[];
  const isSale = listing.listing_type === "sale";

  const specs = [
    listing.rooms && { label: "Өрөөний тоо", value: `${listing.rooms} өрөө` },
    listing.area_sqm && { label: "Талбай", value: `${listing.area_sqm} м²` },
    listing.floor && listing.total_floors && { label: "Давхар", value: `${listing.floor}/${listing.total_floors}` },
    listing.bedrooms && { label: "Унтлагын өрөө", value: `${listing.bedrooms}` },
    listing.bathrooms && { label: "Угаалгын өрөө", value: `${listing.bathrooms}` },
    listing.built_year && { label: "Баригдсан он", value: `${listing.built_year}` },
    listing.has_parking && { label: "Зогсоол", value: "Байна" },
    listing.is_furnished && { label: "Тавилга", value: "Бүрэн" },
    { label: "Хот", value: listing.city },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <Link href="/" className="font-[family-name:var(--font-onest)] font-extrabold text-gray-900 text-xl tracking-tight lowercase hover:text-blue-600 transition-colors">
            nemi
          </Link>
          <div className="flex-1" />
          {session ? (
            <Link href={role === "consumer" ? "/consumer" : role === "agent" ? "/agent" : "/dashboard"}
              className="text-sm font-medium bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">
              Самбар
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 font-medium">Нэвтрэх</Link>
              <Link href="/register?mode=consumer" className="text-sm font-medium bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">
                Бүртгүүлэх
              </Link>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">

            {/* Image Gallery */}
            {images.length > 0 ? (
              <ListingImageCarousel images={images.map((img) => img.url)} title={listing.title} />
            ) : (
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl h-64 flex items-center justify-center">
                <svg className="w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                    d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
              </div>
            )}

            {/* Title + price */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${isSale ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}>
                  {LISTING_TYPE_LABELS[listing.listing_type] ?? listing.listing_type}
                </span>
                <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full">
                  {PROPERTY_TYPE_LABELS[listing.property_type] ?? listing.property_type}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{listing.title}</h1>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-blue-600">₮{formatPrice(listing.price)}</span>
                {listing.area_sqm && (
                  <span className="text-sm text-gray-400">
                    · ₮{Math.round(listing.price / listing.area_sqm / 10000) * 10000 >= 1000000
                      ? `${(listing.price / listing.area_sqm / 1000000).toFixed(1)}сая/м²`
                      : `${Math.round(listing.price / listing.area_sqm).toLocaleString()}/м²`}
                  </span>
                )}
              </div>
              {listing.district && (
                <p className="flex items-center gap-1 text-sm text-gray-500 mt-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  {listing.district}{listing.address ? `, ${listing.address}` : ""}
                </p>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Үндсэн мэдээлэл</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {specs.map((spec) => (
                  <div key={spec.label} className="bg-gray-50 rounded-xl px-3 py-2.5">
                    <p className="text-xs text-gray-400 mb-0.5">{spec.label}</p>
                    <p className="text-sm font-semibold text-gray-900">{spec.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {listing.description && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-900 mb-3">Дэлгэрэнгүй тайлбар</h2>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{listing.description}</p>
              </div>
            )}

            <p className="text-xs text-gray-400 text-right">
              Нийтлэгдсэн: {new Date(listing.created_at).toLocaleDateString("mn-MN")}
            </p>
          </div>

          <div className="space-y-4">
            <InquiryForm listingId={listing.id} isLoggedIn={!!session} isConsumer={role === "consumer"} />
            {listing.agent && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Агент</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-blue-600">
                      {(listing.agent.full_name ?? listing.agent.email)[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{listing.agent.full_name ?? "Агент"}</p>
                    <p className="text-xs text-gray-400 truncate">{listing.agent.email}</p>
                  </div>
                </div>
              </div>
            )}
            <Link href="/"
              className="flex items-center justify-center gap-2 w-full text-sm text-gray-600 border border-gray-300 rounded-xl py-2.5 hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Бүх зар руу буцах
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
