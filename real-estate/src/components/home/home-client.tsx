"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { ListingCard, type PublicListing } from "./listing-card";
import { DISTRICTS } from "@/lib/constants/listings";
import ZoneSelector from "./zone-selector";
import type { SelectedZone } from "./zone-map";
import { filterByZone } from "@/lib/utils/zone-filter";
import AiChat from "./ai-chat";

const ListingMap = dynamic(() => import("./listing-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-50">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

interface HomeClientProps {
  initialListings: PublicListing[];
  isLoggedIn: boolean;
  dashboardHref: string;
  dashboardLabel: string;
}

const PRICE_OPTIONS = [
  { label: "Бүх үнэ", value: "" },
  { label: "50 сая хүртэл", value: "50000000" },
  { label: "100 сая хүртэл", value: "100000000" },
  { label: "200 сая хүртэл", value: "200000000" },
  { label: "500 сая хүртэл", value: "500000000" },
  { label: "1 тэрбум хүртэл", value: "1000000000" },
];

const ROOM_OPTIONS = [
  { label: "Бүх өрөө", value: "" },
  { label: "1+", value: "1" },
  { label: "2+", value: "2" },
  { label: "3+", value: "3" },
  { label: "4+", value: "4" },
];

export default function HomeClient({
  initialListings,
  isLoggedIn,
  dashboardHref,
  dashboardLabel,
}: HomeClientProps) {
  const [listings, setListings] = useState<PublicListing[]>(initialListings);
  const [isAIMode, setIsAIMode] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [zone, setZone] = useState<SelectedZone | null>(null);
  const [showZoneSelector, setShowZoneSelector] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [showMap, setShowMap] = useState(true);

  // Filters
  const [listingType, setListingType] = useState("");
  const [district, setDistrict] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minRooms, setMinRooms] = useState("");

  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const filteredListings = filterByZone(listings, zone);

  const fetchFiltered = useCallback(async () => {
    const params = new URLSearchParams();
    if (district) params.set("district", district);
    if (listingType) params.set("listing_type", listingType);
    if (maxPrice) params.set("max_price", maxPrice);
    if (minRooms) params.set("min_rooms", minRooms);

    const res = await fetch(`/api/public/listings?${params.toString()}`);
    const data = await res.json();
    setListings(data.listings ?? []);
    setIsAIMode(false);
  }, [district, listingType, maxPrice, minRooms]);

  useEffect(() => {
    if (!isAIMode) {
      fetchFiltered();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [district, listingType, maxPrice, minRooms]);

  function handleListingsChange(newListings: PublicListing[], isAI: boolean) {
    setListings(newListings);
    setIsAIMode(isAI);
    setActiveId(null);
  }

  function handleMarkerClick(id: string) {
    setActiveId(id);
    const el = cardRefs.current.get(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function clearFilters() {
    setDistrict("");
    setListingType("");
    setMaxPrice("");
    setMinRooms("");
    setZone(null);
    setIsAIMode(false);
  }

  const hasFilters = !!(district || listingType || maxPrice || minRooms || zone);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="flex-shrink-0 sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-gray-200/70">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3.5 flex items-center gap-4">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
              <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V20a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1V9.75z" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-[15px] tracking-tight">
              RealEstate<span className="text-indigo-600">OS</span>
            </span>
          </a>

          <div className="flex-1" />

          {/* Auth */}
          <div className="flex-shrink-0 flex items-center gap-1.5">
            {isLoggedIn ? (
              <a
                href={dashboardHref}
                className="text-[13px] font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-2 rounded-full hover:shadow-md hover:shadow-indigo-500/25 transition-all"
              >
                {dashboardLabel}
              </a>
            ) : (
              <>
                <a
                  href="/login"
                  className="text-[13px] text-gray-700 hover:text-gray-900 font-medium px-3 py-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  Нэвтрэх
                </a>
                <a
                  href="/register?mode=consumer"
                  className="text-[13px] font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-2 rounded-full hover:shadow-md hover:shadow-indigo-500/25 transition-all"
                >
                  Бүртгүүлэх
                </a>
              </>
            )}
          </div>
        </div>

        {/* Filter pills row */}
        <div className="border-t border-gray-100/70 bg-white/60">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 overflow-x-auto scrollbar-none">
            {/* Zarah / Tureesleh segmented */}
            <div className="flex p-0.5 bg-gray-100 rounded-full text-[13px] font-medium flex-shrink-0">
              {[
                { v: "", label: "Бүгд" },
                { v: "sale", label: "Зарах" },
                { v: "rent", label: "Түрээслэх" },
              ].map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setListingType(opt.v)}
                  className={`px-3.5 py-1.5 rounded-full transition-all ${
                    listingType === opt.v
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <FilterSelect
              value={district}
              onChange={setDistrict}
              icon={
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <circle cx="12" cy="11" r="3" />
                </svg>
              }
              options={[{ label: "Бүх дүүрэг", value: "" }, ...DISTRICTS.map((d) => ({ label: d, value: d }))]}
              placeholder="Дүүрэг"
            />

            <FilterSelect
              value={maxPrice}
              onChange={setMaxPrice}
              icon={
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
              }
              options={PRICE_OPTIONS}
            />

            <FilterSelect
              value={minRooms}
              onChange={setMinRooms}
              icon={
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M3 6h18M3 18h18" />
                </svg>
              }
              options={ROOM_OPTIONS}
            />

            <button
              onClick={() => setShowZoneSelector(true)}
              className={`flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-1.5 rounded-full border transition-all flex-shrink-0 ${
                zone
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/20"
                  : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="1" fill="currentColor" />
              </svg>
              {zone ? zone.label : "Газрын зураг дээр"}
            </button>

            {(hasFilters || isAIMode) && (
              <button
                onClick={clearFilters}
                className="text-[13px] text-gray-500 hover:text-gray-900 flex-shrink-0 px-2.5 py-1.5"
              >
                Цэвэрлэх
              </button>
            )}

            <div className="flex-1" />

            <span className="text-[12px] text-gray-500 flex items-center gap-1.5 flex-shrink-0">
              {isAIMode && (
                <span className="inline-flex items-center gap-1 bg-gradient-to-r from-indigo-100 to-violet-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold text-[10px]">
                  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2L8 6 4 7l3 3-1 5 4-2 4 2-1-5 3-3-4-1z" />
                  </svg>
                  AI
                </span>
              )}
              <strong className="text-gray-900 font-semibold">{filteredListings.length}</strong> зар
            </span>

            {/* Map toggle (mobile) */}
            <button
              onClick={() => setShowMap(!showMap)}
              className="md:hidden flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-full bg-gray-900 text-white flex-shrink-0"
            >
              {showMap ? "Жагсаалт" : "Зураг"}
            </button>
          </div>
        </div>
      </header>

      {/* Zone selector modal */}
      {showZoneSelector && (
        <ZoneSelector
          currentZone={zone}
          onApply={(z) => setZone(z)}
          onClose={() => setShowZoneSelector(false)}
        />
      )}

      {/* ── AI Prompt Hero Bar (always visible at top) ─────────── */}
      <div className="flex-shrink-0 border-b border-gray-200/70 bg-gradient-to-br from-indigo-50/40 via-white to-violet-50/40">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-4">
          <button
            onClick={() => setShowAiPanel(true)}
            className="group w-full flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all text-left"
          >
            <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2L8 6 4 7l3 3-1 5 4-2 4 2-1-5 3-3-4-1z" />
              </svg>
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[14px] font-semibold text-gray-900">
                AI Зуучлагчтай ярих
              </span>
              <span className="block text-[12.5px] text-gray-500 truncate">
                Жишээ: «БЗД, 2 өрөө, 300 саяас доош, метро ойр»
              </span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full group-hover:bg-indigo-100 transition-colors">
              Эхлэх
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </button>
        </div>
      </div>

      {/* ── Main: Grid (left) + Map (right) — Airbnb-style ─────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: listing grid */}
        <div
          className={`flex flex-col overflow-hidden flex-1 ${
            !showMap ? "w-full" : "md:max-w-[60%]"
          }`}
        >
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-5">
              {filteredListings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {zone ? "Энэ бүсэд зар олдсонгүй" : "Зар олдсонгүй"}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Шүүлтүүрээ өргөтгөөд эсвэл AI-аас асуу
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-baseline justify-between mb-4">
                    <h1 className="text-[20px] font-bold text-gray-900 tracking-tight">
                      {hasFilters || isAIMode ? "Хайлтын үр дүн" : "Шинэ зарууд"}
                    </h1>
                    <p className="text-[13px] text-gray-500">
                      {filteredListings.length} тохирол
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredListings.map((listing) => (
                      <div
                        key={listing.id}
                        ref={(el) => {
                          if (el) cardRefs.current.set(listing.id, el);
                        }}
                      >
                        <ListingCard
                          listing={listing}
                          active={listing.id === activeId}
                          onClick={() =>
                            setActiveId(listing.id === activeId ? null : listing.id)
                          }
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: sticky map */}
        {showMap && (
          <div className="hidden md:block w-[40%] border-l border-gray-200 relative">
            <ListingMap
              listings={filteredListings}
              activeId={activeId}
              onMarkerClick={handleMarkerClick}
            />
          </div>
        )}
      </div>

      {/* AI Chat: floating panel (opens when user taps the hero bar) */}
      {showAiPanel && (
        <div className="fixed bottom-6 right-6 z-40 w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-7rem)] bg-white rounded-2xl shadow-2xl shadow-indigo-500/20 ring-1 ring-gray-200 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-violet-50">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
                AI
              </div>
              <div>
                <p className="text-[13px] font-semibold text-gray-900">AI Зуучлагч</p>
                <p className="text-[11px] text-gray-500">Байгалийн хэлээр асуу</p>
              </div>
            </div>
            <button
              onClick={() => setShowAiPanel(false)}
              aria-label="Хаах"
              className="w-7 h-7 rounded-full hover:bg-white/70 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <AiChat
              onListingsChange={handleListingsChange}
              district={district}
              listingType={listingType}
              maxPrice={maxPrice}
              minRooms={minRooms}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── helpers ────────────────────────────────────────────────── */

function FilterSelect({
  value,
  onChange,
  options,
  icon,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
  icon?: React.ReactNode;
  placeholder?: string;
}) {
  const active = !!value;
  return (
    <div
      className={`flex items-center gap-1.5 px-3 rounded-full border transition-colors flex-shrink-0 ${
        active
          ? "bg-indigo-50 border-indigo-200 text-indigo-700"
          : "bg-white border-gray-200 hover:border-gray-300 text-gray-700"
      }`}
    >
      {icon && <span className={active ? "text-indigo-500" : "text-gray-400"}>{icon}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-[13px] font-medium bg-transparent py-1.5 pr-1 focus:outline-none cursor-pointer"
      >
        {placeholder && !value && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
