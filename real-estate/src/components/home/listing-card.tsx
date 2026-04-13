import { PROPERTY_TYPE_LABELS, LISTING_TYPE_LABELS } from "@/lib/constants/listings";

export interface PublicListing {
  id: string;
  title: string;
  price: number;
  rooms: number | null;
  area_sqm: number | null;
  floor: number | null;
  total_floors: number | null;
  property_type: string;
  listing_type: string;
  district: string | null;
  address: string | null;
  similarity?: number;
}

function formatPrice(price: number) {
  if (price >= 1_000_000_000) return `${(price / 1_000_000_000).toFixed(1)} тэрбум`;
  if (price >= 1_000_000) return `${Math.round(price / 1_000_000)} сая`;
  return price.toLocaleString("mn-MN");
}

interface ListingCardProps {
  listing: PublicListing;
  active?: boolean;
  onClick?: () => void;
}

export function ListingCard({ listing, active, onClick }: ListingCardProps) {
  const isSale = listing.listing_type === "sale";

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border cursor-pointer transition-all duration-150 overflow-hidden group ${
        active
          ? "border-blue-500 shadow-md ring-1 ring-blue-400"
          : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
      }`}
    >
      {/* Image placeholder */}
      <div className="h-36 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative">
        <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
            d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} points="9 22 9 12 15 12 15 22" />
        </svg>
        <span className={`absolute top-2 left-2 text-xs font-semibold px-2 py-0.5 rounded-full ${
          isSale ? "bg-blue-600 text-white" : "bg-emerald-600 text-white"
        }`}>
          {LISTING_TYPE_LABELS[listing.listing_type] ?? listing.listing_type}
        </span>
        {listing.similarity != null && (
          <span className="absolute top-2 right-2 text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">
            {Math.round(listing.similarity * 100)}% тохирол
          </span>
        )}
      </div>

      <div className="p-3">
        <a href={`/listings/${listing.id}`}
          onClick={(e) => e.stopPropagation()}
          className="font-semibold text-gray-900 text-sm truncate block group-hover:text-blue-600 transition-colors">
          {listing.title}
        </a>
        <p className="text-blue-600 font-bold text-base mt-0.5">
          ₮{formatPrice(listing.price)}
        </p>
        <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
          {listing.rooms && <span>{listing.rooms} өр</span>}
          {listing.rooms && listing.area_sqm && <span>·</span>}
          {listing.area_sqm && <span>{listing.area_sqm}м²</span>}
          {listing.floor && listing.total_floors && (
            <><span>·</span><span>{listing.floor}/{listing.total_floors} давхар</span></>
          )}
        </div>
        <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-400">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <circle cx="12" cy="11" r="3" strokeWidth={2} />
          </svg>
          <span>{listing.district ?? "—"}</span>
          {listing.address && <span className="truncate">· {listing.address}</span>}
        </div>
      </div>
    </div>
  );
}
