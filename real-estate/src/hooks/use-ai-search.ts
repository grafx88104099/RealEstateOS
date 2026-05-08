// hooks/use-ai-search.ts
// React hook for AI-powered listing search
// Debounced input, caching, loading/error states

"use client";

import { useState, useCallback, useRef } from "react";

interface SearchFilters {
  minPrice?: number;
  maxPrice?: number;
  minRooms?: number;
  maxRooms?: number;
  propertyType?: string;
  district?: string;
}

interface MatchedListing {
  id: string;
  title: string;
  description: string;
  price: number;
  rooms: number;
  property_type: string;
  district: string;
  address: string;
  area_sqm: number;
  latitude: number;
  longitude: number;
  images: string[];
  similarity: number;
}

interface SearchMeta {
  query: string;
  count: number;
  threshold: number;
  tokens_used: number;
}

interface UseAISearchReturn {
  results: MatchedListing[];
  meta: SearchMeta | null;
  isLoading: boolean;
  error: string | null;
  search: (query: string, filters?: SearchFilters) => Promise<void>;
  clear: () => void;
}

export function useAISearch(): UseAISearchReturn {
  const [results, setResults] = useState<MatchedListing[]>([]);
  const [meta, setMeta] = useState<SearchMeta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Abort controller for cancelling in-flight requests
  const abortRef = useRef<AbortController | null>(null);

  // Simple in-memory cache (query → results)
  const cacheRef = useRef<Map<string, { results: MatchedListing[]; meta: SearchMeta }>>(
    new Map()
  );

  const search = useCallback(
    async (query: string, filters?: SearchFilters) => {
      // Cancel previous request
      if (abortRef.current) {
        abortRef.current.abort();
      }

      const trimmed = query.trim();
      if (!trimmed) {
        setResults([]);
        setMeta(null);
        setError(null);
        return;
      }

      // Check cache
      const cacheKey = JSON.stringify({ query: trimmed, filters });
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        setResults(cached.results);
        setMeta(cached.meta);
        setError(null);
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/ai/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: trimmed,
            filters,
            threshold: 0.25,
            limit: 20,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || `Search failed (${response.status})`);
        }

        const data = await response.json();

        // Cache the result
        cacheRef.current.set(cacheKey, {
          results: data.results,
          meta: data.meta,
        });

        // Limit cache size
        if (cacheRef.current.size > 50) {
          const firstKey = cacheRef.current.keys().next().value;
          if (firstKey) cacheRef.current.delete(firstKey);
        }

        setResults(data.results);
        setMeta(data.meta);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return; // Cancelled, ignore
        }
        setError(err instanceof Error ? err.message : "Search failed");
        setResults([]);
        setMeta(null);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const clear = useCallback(() => {
    setResults([]);
    setMeta(null);
    setError(null);
  }, []);

  return { results, meta, isLoading, error, search, clear };
}
