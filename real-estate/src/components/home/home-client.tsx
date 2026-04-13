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
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
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

  // Filters
  const [listingType, setListingType] = useState("");
  const [district, setDistrict] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minRooms, setMinRooms] = useState("");

  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Zone filter дагуу шүүсэн listings
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
    <div className="flex flex-col h-screen overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3 z-20">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <span className="font-bold text-gray-900 text-base flex-shrink-0">Real Estate OS</span>

          <div className="flex-1" />

          {/* Auth */}
          <div className="flex-shrink-0 flex items-center gap-2">
            {isLoggedIn ? (
              <a href={dashboardHref} className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap">
                {dashboardLabel}
              </a>
            ) : (
              <>
                <a href="/login" className="text-sm text-gray-600 hover:text-gray-900 font-medium whitespace-nowrap">Нэвтрэх</a>
                <a href="/register?mode=consumer" className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap">
                  Бүртгүүлэх
                </a>
              </>
            )}
          </div>
        </div>

        {/* Filter bar */}
        <div className="max-w-screen-xl mx-auto flex items-center gap-2 mt-2 flex-wrap">
          {/* Зарах / Түрээслэх */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
            <button
              onClick={() => setListingType("")}
              className={`px-3 py-1.5 font-medium transition-colors ${listingType === "" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >Бүгд</button>
            <button
              onClick={() => setListingType("sale")}
              className={`px-3 py-1.5 font-medium transition-colors border-l border-gray-300 ${listingType === "sale" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >Зарах</button>
            <button
              onClick={() => setListingType("rent")}
              className={`px-3 py-1.5 font-medium transition-colors border-l border-gray-300 ${listingType === "rent" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >Түрээслэх</button>
          </div>

          {/* Дүүрэг */}
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Бүх дүүрэг</option>
            {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>

          {/* Үнэ */}
          <select
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {PRICE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {/* Өрөө */}
          <select
            value={minRooms}
            onChange={(e) => setMinRooms(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ROOM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {/* Бүс сонгох */}
          <button
            onClick={() => setShowZoneSelector(true)}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              zone
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="12" r="9" strokeWidth={2} />
              <circle cx="12" cy="12" r="1" fill="currentColor" />
            </svg>
            {zone ? zone.label : "Бүс сонгох"}
          </button>

          {/* Clear */}
          {(hasFilters || isAIMode) && (
            <button onClick={clearFilters} className="text-sm text-gray-500 hover:text-gray-700 underline">
              Цэвэрлэх
            </button>
          )}

          {/* Result count */}
          <span className="text-xs text-gray-400 ml-auto flex items-center gap-1.5">
            {isAIMode && (
              <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium text-[10px]">AI</span>
            )}
            {filteredListings.length} зар
          </span>
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

      {/* ── Main: 80% left + 20% right ──────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Зүүн багана 80%: Map дээр + Cards доор */}
        <div className="flex flex-col overflow-hidden" style={{ width: "80%" }}>

          {/* Газарын зураг — дээр, 55% */}
          <div className="flex-[0_0_55%] min-h-0 relative">
            <ListingMap
              listings={filteredListings}
              activeId={activeId}
              onMarkerClick={handleMarkerClick}
            />
          </div>

          {/* Зарын картууд — доор, scroll */}
          <div className="flex-1 overflow-y-auto bg-gray-50 border-t border-gray-200 min-h-0">
            {filteredListings.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm gap-2">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p>{zone ? "Энэ бүсэд зар олдсонгүй" : "Зар олдсонгүй"}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 p-3">
                {filteredListings.map((listing) => (
                  <div
                    key={listing.id}
                    ref={(el) => { if (el) cardRefs.current.set(listing.id, el); }}
                  >
                    <ListingCard
                      listing={listing}
                      active={listing.id === activeId}
                      onClick={() => setActiveId(listing.id === activeId ? null : listing.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Баруун багана 20%: AI Чат */}
        <div className="flex-shrink-0 border-l border-gray-200 overflow-hidden" style={{ width: "20%" }}>
          <AiChat
            onListingsChange={handleListingsChange}
            district={district}
            listingType={listingType}
            maxPrice={maxPrice}
            minRooms={minRooms}
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="flex-shrink-0 bg-white border-t border-gray-200 px-6 py-2.5 flex items-center justify-between z-20">
        <span className="text-xs text-gray-400">© 2026 Real Estate OS</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">Та мэргэжлийн агент уу?</span>
          <a
            href="/agent-portal"
            className="text-xs font-medium text-gray-600 hover:text-blue-600 border border-gray-300 hover:border-blue-400 px-3 py-1.5 rounded-lg transition-colors"
          >
            Агентын нүүр →
          </a>
        </div>
      </footer>
    </div>
  );
}
