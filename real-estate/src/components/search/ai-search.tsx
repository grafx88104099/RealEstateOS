"use client";

import { useState, useCallback, useRef } from "react";
import { useAISearch } from "@/hooks/use-ai-search";

function formatPrice(price: number): string {
  if (price >= 1_000_000_000) return `${(price / 1_000_000_000).toFixed(1)} тэрбум₮`;
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(0)} сая₮`;
  return `${price.toLocaleString()}₮`;
}

export default function AISearch() {
  const [query, setQuery] = useState("");
  const { results, meta, isLoading, error, search, clear } = useAISearch();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleInput = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) { clear(); return; }
    debounceRef.current = setTimeout(() => search(value), 600);
  }, [search, clear]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim()) search(query);
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Search box */}
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="Хайх... жишээ: СБД-д 3 өрөө, 150 сая хүртэл орон сууц"
          className="w-full border border-gray-300 rounded-xl px-5 py-3.5 pr-24 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="absolute right-2 top-2 bottom-2 bg-blue-600 text-white text-sm font-medium px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isLoading ? "..." : "Хайх"}
        </button>
      </form>

      {/* Meta info */}
      {meta && (
        <p className="text-xs text-gray-400 mt-2 px-1">
          {meta.count} үр дүн · {meta.tokens_used} token ашиглав
        </p>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {!isLoading && results.length > 0 && (
        <div className="mt-4 space-y-3">
          {results.map((listing) => (
            <div key={listing.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{listing.title}</h3>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{listing.description}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {listing.district && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {listing.district}
                      </span>
                    )}
                    {listing.rooms && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {listing.rooms} өрөө
                      </span>
                    )}
                    {listing.area_sqm && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {listing.area_sqm}м²
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-gray-900 text-sm">{formatPrice(listing.price)}</p>
                  <p className="text-xs text-blue-500 mt-1">
                    {Math.round(listing.similarity * 100)}% тохирол
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && meta && results.length === 0 && (
        <div className="mt-8 text-center text-gray-400 text-sm">
          Таны хайлтад тохирох зар олдсонгүй
        </div>
      )}
    </div>
  );
}
