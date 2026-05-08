import { LISTING_TYPE_LABELS } from "@/lib/constants/listings";

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
    <article
      onClick={onClick}
      className={`group relative bg-white rounded-2xl cursor-pointer transition-all duration-200 overflow-hidden
        ${
          active
            ? "ring-2 ring-indigo-500 shadow-[0_8px_30px_rgba(99,102,241,0.15)]"
            : "ring-1 ring-gray-200/70 hover:ring-gray-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-0.5"
        }`}
    >
      {/* Image area */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100">
        {/* Subtle decorative pattern */}
        <div className="absolute inset-0 flex items-center justify-center text-slate-300">
          <svg
            className="w-12 h-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.25"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 9.75L12 3l9 6.75V20a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1V9.75z"
            />
          </svg>
        </div>

        {/* Gradient overlay top */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/15 to-transparent pointer-events-none" />

        {/* Type badge */}
        <span
          className={`absolute top-3 left-3 text-[11px] font-semibold tracking-wide uppercase px-2.5 py-1 rounded-full backdrop-blur-md ${
            isSale
              ? "bg-indigo-600/95 text-white shadow-sm"
              : "bg-emerald-600/95 text-white shadow-sm"
          }`}
        >
          {LISTING_TYPE_LABELS[listing.listing_type] ?? listing.listing_type}
        </span>

        {listing.similarity != null && (
          <span className="absolute top-3 right-3 text-[11px] bg-white/95 backdrop-blur text-indigo-700 font-semibold px-2.5 py-1 rounded-full shadow-sm">
            {Math.round(listing.similarity * 100)}% тохирол
          </span>
        )}

        {/* Save / heart (placeholder for Phase B saved-listings) */}
        <button
          onClick={(e) => e.stopPropagation()}
          aria-label="Хадгалах"
          className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-white/90 hover:bg-white backdrop-blur shadow-sm flex items-center justify-center text-gray-600 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z"
            />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <a
            href={`/listings/${listing.id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-semibold text-gray-900 text-[15px] leading-snug line-clamp-1 group-hover:text-indigo-600 transition-colors"
          >
            {listing.title}
          </a>
        </div>

        <p className="mt-1 text-[18px] font-bold text-gray-900 tracking-tight">
          ₮{formatPrice(listing.price)}
        </p>

        <div className="mt-2 flex items-center gap-1.5 text-[13px] text-gray-500">
          {listing.rooms != null && <span>{listing.rooms} өр</span>}
          {listing.rooms != null && listing.area_sqm != null && (
            <span className="text-gray-300">·</span>
          )}
          {listing.area_sqm != null && <span>{listing.area_sqm} м²</span>}
          {listing.floor && listing.total_floors && (
            <>
              <span className="text-gray-300">·</span>
              <span>
                {listing.floor}/{listing.total_floors} давхар
              </span>
            </>
          )}
        </div>

        <div className="mt-2 flex items-center gap-1.5 text-[12.5px] text-gray-400">
          <svg
            className="w-3.5 h-3.5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <circle cx="12" cy="11" r="2.5" />
          </svg>
          <span className="truncate">
            {listing.district ?? "—"}
            {listing.address ? ` · ${listing.address}` : ""}
          </span>
        </div>
      </div>
    </article>
  );
}
