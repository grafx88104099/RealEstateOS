"use client";

import { useEffect, useRef } from "react";
import type { PublicListing } from "./listing-card";
import { DISTRICT_COORDS, UB_CENTER } from "@/lib/constants/districts";
import { PROPERTY_TYPE_LABELS, LISTING_TYPE_LABELS } from "@/lib/constants/listings";
import { loadGoogleMaps } from "@/lib/google-maps-loader";

function formatPrice(price: number) {
  if (price >= 1_000_000_000) return `${(price / 1_000_000_000).toFixed(1)}тэрбум`;
  if (price >= 1_000_000) return `${Math.round(price / 1_000_000)}сая`;
  return price.toLocaleString();
}

interface ListingMapProps {
  listings: PublicListing[];
  activeId: string | null;
  onMarkerClick: (id: string) => void;
}

interface MarkerEntry {
  marker: google.maps.marker.AdvancedMarkerElement;
  el: HTMLDivElement;
  listingType: PublicListing["listing_type"];
}

function createMarkerEl(
  price: number,
  listingType: PublicListing["listing_type"],
  active: boolean,
) {
  const el = document.createElement("div");
  applyMarkerStyle(el, price, listingType, active);
  return el;
}

function applyMarkerStyle(
  el: HTMLDivElement,
  price: number,
  listingType: PublicListing["listing_type"],
  active: boolean,
) {
  const isSale = listingType === "sale";
  const bg = active ? "#1d4ed8" : isSale ? "#2563eb" : "#059669";
  el.textContent = `₮${formatPrice(price)}`;
  el.style.cssText = `
    background:${bg};
    color:white;
    padding:3px 7px;
    border-radius:12px;
    font-size:11px;
    font-weight:600;
    white-space:nowrap;
    box-shadow:0 2px 6px rgba(0,0,0,0.25);
    border:2px solid ${active ? "#93c5fd" : "transparent"};
    transform:${active ? "scale(1.15)" : "scale(1)"};
    transition:all 0.15s;
    cursor:pointer;
  `;
}

function popupHtml(listing: PublicListing) {
  return `<div style="min-width:190px;font-family:inherit">
    <p style="font-weight:600;font-size:13px;margin:0 0 4px">${listing.title}</p>
    <p style="color:#2563eb;font-weight:700;font-size:14px;margin:0 0 4px">₮${formatPrice(listing.price)}</p>
    <p style="font-size:11px;color:#6b7280;margin:0">
      ${listing.rooms ? listing.rooms + " өр · " : ""}${listing.area_sqm ? listing.area_sqm + "м² · " : ""}${listing.district ?? ""}
    </p>
    <p style="font-size:11px;color:#9ca3af;margin:4px 0 6px">${LISTING_TYPE_LABELS[listing.listing_type] ?? ""} · ${PROPERTY_TYPE_LABELS[listing.property_type] ?? ""}</p>
    <a href="/listings/${listing.id}" style="display:inline-block;background:#2563eb;color:white;font-size:11px;font-weight:600;padding:4px 10px;border-radius:6px;text-decoration:none;">Дэлгэрэнгүй →</a>
  </div>`;
}

export default function ListingMap({ listings, activeId, onMarkerClick }: ListingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map());

  useEffect(() => {
    let cancelled = false;
    if (!mapRef.current) return;

    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !mapRef.current || mapInstanceRef.current) return;
        mapInstanceRef.current = new g.maps.Map(mapRef.current, {
          center: { lat: UB_CENTER[0], lng: UB_CENTER[1] },
          zoom: 12,
          mapId: "DEMO_MAP_ID",
          disableDefaultUI: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
        });
        infoWindowRef.current = new g.maps.InfoWindow({ maxWidth: 240 });
      })
      .catch((err) => console.error("Google Maps load failed:", err));

    return () => {
      cancelled = true;
      markersRef.current.forEach(({ marker }) => (marker.map = null));
      markersRef.current.clear();
      infoWindowRef.current?.close();
      infoWindowRef.current = null;
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then((g) => {
      if (cancelled) return;
      const map = mapInstanceRef.current;
      if (!map) return;

      markersRef.current.forEach(({ marker }) => (marker.map = null));
      markersRef.current.clear();

      listings.forEach((listing) => {
        const base = listing.district
          ? (DISTRICT_COORDS[listing.district] ?? UB_CENTER)
          : UB_CENTER;
        const jitter = () => (Math.random() - 0.5) * 0.012;
        const lat = base[0] + jitter();
        const lng = base[1] + jitter();

        const isActive = listing.id === activeId;
        const el = createMarkerEl(listing.price, listing.listing_type, isActive);

        const marker = new g.maps.marker.AdvancedMarkerElement({
          map,
          position: { lat, lng },
          content: el,
        });

        marker.addListener("click", () => {
          if (infoWindowRef.current) {
            infoWindowRef.current.setContent(popupHtml(listing));
            infoWindowRef.current.open({ map, anchor: marker });
          }
          onMarkerClick(listing.id);
        });

        markersRef.current.set(listing.id, {
          marker,
          el,
          listingType: listing.listing_type,
        });
      });
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings]);

  useEffect(() => {
    markersRef.current.forEach((entry, id) => {
      const listing = listings.find((l) => l.id === id);
      if (!listing) return;
      applyMarkerStyle(entry.el, listing.price, entry.listingType, id === activeId);
    });

    if (activeId) {
      const entry = markersRef.current.get(activeId);
      const listing = listings.find((l) => l.id === activeId);
      if (entry && listing && infoWindowRef.current && mapInstanceRef.current) {
        infoWindowRef.current.setContent(popupHtml(listing));
        infoWindowRef.current.open({
          map: mapInstanceRef.current,
          anchor: entry.marker,
        });
      }
    }
  }, [activeId, listings]);

  return (
    <div ref={mapRef} className="w-full h-full" style={{ minHeight: "100%" }} />
  );
}
