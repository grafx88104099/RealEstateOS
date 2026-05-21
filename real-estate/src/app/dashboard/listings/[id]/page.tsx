import { createSupabaseServer } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import DeleteListingButton from "@/components/listings/delete-button";
import { EditListingForm } from "@/components/listings/edit-listing-form";
import { DocumentGenerator } from "@/components/listings/document-generator";
import { ImageGallery } from "@/components/listings/image-gallery";
import { ListingStats } from "@/components/listings/listing-stats";
import { DuplicateButton } from "@/components/listings/duplicate-button";

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServer();

  const [listingRes, inquiryCountRes] = await Promise.all([
    supabase.from("listings").select("*").eq("id", id).is("deleted_at", null).single(),
    supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("listing_id", id).is("deleted_at", null),
  ]);

  const listing = listingRes.data;
  if (listingRes.error || !listing) notFound();

  const hasEmbedding = !!listing.embedding;
  const inquiryCount = inquiryCountRes.count ?? 0;
  // Server-rendered тул Date.now() ашиглах нь OK (render бүрт refresh)
  // eslint-disable-next-line react-hooks/purity
  const daysOnMarket = Math.max(0, Math.floor((Date.now() - new Date(listing.created_at).getTime()) / 86400000));

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <Link href="/dashboard/listings" className="text-sm text-gray-500 hover:text-gray-700">
          ← Зарууд руу буцах
        </Link>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${hasEmbedding ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
            {hasEmbedding ? "AI embedded" : "Embedding хүлээгдэж байна"}
          </span>
          <DuplicateButton listingId={listing.id} />
          <DeleteListingButton id={listing.id} />
        </div>
      </div>

      <h1 className="text-xl font-bold text-gray-900 mb-4">Зар засварлах</h1>

      {/* Stats */}
      <ListingStats
        inquiryCount={inquiryCount}
        daysOnMarket={daysOnMarket}
        hasEmbedding={hasEmbedding}
        status={listing.status}
      />

      {/* Edit Form */}
      <div className="mt-6">
        <EditListingForm
          listing={{
            id: listing.id,
            title: listing.title,
            description: listing.description,
            price: listing.price,
            rooms: listing.rooms,
            area_sqm: listing.area_sqm ? Number(listing.area_sqm) : null,
            floor: listing.floor,
            total_floors: listing.total_floors,
            property_type: listing.property_type,
            listing_type: listing.listing_type,
            district: listing.district,
            address: listing.address,
            status: listing.status,
          }}
          backUrl="/dashboard/listings"
        />
      </div>

      {/* Image Gallery */}
      <ImageGallery listingId={listing.id} />

      {/* Document Generator */}
      <DocumentGenerator listingId={listing.id} />
    </div>
  );
}
