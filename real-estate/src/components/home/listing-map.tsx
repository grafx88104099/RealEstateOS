"use client";

import { useEffect, useRef } from "react";
import type { PublicListing } from "./listing-card";
import { DISTRICT_COORDS, UB_CENTER } from "@/lib/constants/districts";
import { PROPERTY_TYPE_LABELS, LISTING_TYPE_LABELS } from "@/lib/constants/listings";

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

export default function ListingMap({ listings, activeId, onMarkerClick }: ListingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<Map<string, import("leaflet").Marker>>(new Map());

  useEffect(() => {
    if (!mapRef.current) return;
    // StrictMode-д 2 удаа дуудагдахаас сэргийлэх
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((mapRef.current as any)._leaflet_id) return;

    // Dynamic import — SSR-д ажилладаггүй тул client-д л ачаална
    import("leaflet").then((L) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!mapRef.current || (mapRef.current as any)._leaflet_id) return;

      // Leaflet default icon fix for Next.js
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current, { zoomControl: true }).setView(UB_CENTER, 12);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    });

    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  // Markers update
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    import("leaflet").then((L) => {
      // Хуучин markers устгах
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();

      listings.forEach((listing) => {
        const coords = listing.district
          ? (DISTRICT_COORDS[listing.district] ?? UB_CENTER)
          : UB_CENTER;

        // Жижиг scatter нэмэх — ижил дүүргийн олон зар давхцахгүй
        const jitter = () => (Math.random() - 0.5) * 0.012;
        const pos: [number, number] = [coords[0] + jitter(), coords[1] + jitter()];

        const isActive = listing.id === activeId;
        const isSale = listing.listing_type === "sale";

        const icon = L.divIcon({
          className: "",
          html: `<div style="
            background:${isActive ? "#1d4ed8" : isSale ? "#2563eb" : "#059669"};
            color:white;
            padding:3px 7px;
            border-radius:12px;
            font-size:11px;
            font-weight:600;
            white-space:nowrap;
            box-shadow:0 2px 6px rgba(0,0,0,0.25);
            border:2px solid ${isActive ? "#93c5fd" : "transparent"};
            transform:${isActive ? "scale(1.15)" : "scale(1)"};
            transition:all 0.15s;
          ">₮${formatPrice(listing.price)}</div>`,
          iconAnchor: [0, 0],
        });

        const marker = L.marker(pos, { icon })
          .addTo(map)
          .bindPopup(
            `<div style="min-width:190px">
              <p style="font-weight:600;font-size:13px;margin:0 0 4px">${listing.title}</p>
              <p style="color:#2563eb;font-weight:700;font-size:14px;margin:0 0 4px">₮${formatPrice(listing.price)}</p>
              <p style="font-size:11px;color:#6b7280;margin:0">
                ${listing.rooms ? listing.rooms + " өр · " : ""}${listing.area_sqm ? listing.area_sqm + "м² · " : ""}${listing.district ?? ""}
              </p>
              <p style="font-size:11px;color:#9ca3af;margin:4px 0 6px">${LISTING_TYPE_LABELS[listing.listing_type] ?? ""} · ${PROPERTY_TYPE_LABELS[listing.property_type] ?? ""}</p>
              <a href="/listings/${listing.id}" style="display:inline-block;background:#2563eb;color:white;font-size:11px;font-weight:600;padding:4px 10px;border-radius:6px;text-decoration:none;">Дэлгэрэнгүй →</a>
            </div>`,
            { maxWidth: 240 }
          )
          .on("click", () => onMarkerClick(listing.id));

        markersRef.current.set(listing.id, marker);
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings]);

  // Active marker highlight
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    import("leaflet").then((L) => {
      markersRef.current.forEach((marker, id) => {
        const listing = listings.find((l) => l.id === id);
        if (!listing) return;
        const isActive = id === activeId;
        const isSale = listing.listing_type === "sale";

        const icon = L.divIcon({
          className: "",
          html: `<div style="
            background:${isActive ? "#1d4ed8" : isSale ? "#2563eb" : "#059669"};
            color:white;
            padding:3px 7px;
            border-radius:12px;
            font-size:11px;
            font-weight:600;
            white-space:nowrap;
            box-shadow:0 2px 6px rgba(0,0,0,0.25);
            border:2px solid ${isActive ? "#93c5fd" : "transparent"};
            transform:${isActive ? "scale(1.15)" : "scale(1)"};
          ">₮${formatPrice(listing.price)}</div>`,
          iconAnchor: [0, 0],
        });
        marker.setIcon(icon);
        if (isActive) marker.openPopup();
      });
    });
  }, [activeId, listings]);

  return (
    <div ref={mapRef} className="w-full h-full rounded-none" style={{ minHeight: "100%" }} />
  );
}
