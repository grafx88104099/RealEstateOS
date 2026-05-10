"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { UB_CENTER } from "@/lib/constants/districts";
import { loadGoogleMaps } from "@/lib/google-maps-loader";

export interface SelectedZone {
  circle: { center: [number, number]; radiusKm: number };
  label: string;
}

export interface ZoneMapHandle {
  clearZone: () => void;
  setRadius: (km: number) => void;
}

interface ZoneMapProps {
  radiusKm: number;
  onZoneChange: (zone: SelectedZone | null) => void;
}

const ZoneMap = forwardRef<ZoneMapHandle, ZoneMapProps>(({ radiusKm, onZoneChange }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({
    map: null as google.maps.Map | null,
    circleLayer: null as google.maps.Circle | null,
    centerMarker: null as google.maps.marker.AdvancedMarkerElement | null,
    circleCenter: null as [number, number] | null,
    radiusKm: 2,
    clickListener: null as google.maps.MapsEventListener | null,
  });

  useImperativeHandle(ref, () => ({
    clearZone: () => {
      clearCircle();
      onZoneChange(null);
    },
    setRadius: (km: number) => {
      const s = stateRef.current;
      s.radiusKm = km;
      if (s.circleLayer && s.circleCenter) {
        s.circleLayer.setRadius(km * 1000);
        onZoneChange({ circle: { center: s.circleCenter, radiusKm: km }, label: `${km}км радиус` });
      }
    },
  }));

  function clearCircle() {
    const s = stateRef.current;
    s.circleLayer?.setMap(null);
    s.circleLayer = null;
    if (s.centerMarker) s.centerMarker.map = null;
    s.centerMarker = null;
    s.circleCenter = null;
  }

  useEffect(() => {
    let cancelled = false;
    if (!containerRef.current) return;

    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !containerRef.current || stateRef.current.map) return;

        const map = new g.maps.Map(containerRef.current, {
          center: { lat: UB_CENTER[0], lng: UB_CENTER[1] },
          zoom: 12,
          mapId: "DEMO_MAP_ID",
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          draggableCursor: "crosshair",
        });
        stateRef.current.map = map;

        stateRef.current.clickListener = map.addListener(
          "click",
          (e: google.maps.MapMouseEvent) => {
            if (!e.latLng) return;
            const center: [number, number] = [e.latLng.lat(), e.latLng.lng()];
            const s = stateRef.current;
            s.circleCenter = center;

            s.circleLayer?.setMap(null);
            if (s.centerMarker) s.centerMarker.map = null;

            s.circleLayer = new g.maps.Circle({
              map,
              center: { lat: center[0], lng: center[1] },
              radius: s.radiusKm * 1000,
              strokeColor: "#2563eb",
              strokeWeight: 2,
              fillColor: "#93c5fd",
              fillOpacity: 0.25,
              clickable: false,
            });

            const dot = document.createElement("div");
            dot.style.cssText =
              "width:14px;height:14px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.35)";
            s.centerMarker = new g.maps.marker.AdvancedMarkerElement({
              map,
              position: { lat: center[0], lng: center[1] },
              content: dot,
            });

            onZoneChange({
              circle: { center, radiusKm: s.radiusKm },
              label: `${s.radiusKm}км радиус`,
            });
          },
        );
      })
      .catch((err) => console.error("Google Maps load failed:", err));

    return () => {
      cancelled = true;
      const s = stateRef.current;
      s.clickListener?.remove();
      s.clickListener = null;
      s.circleLayer?.setMap(null);
      s.circleLayer = null;
      if (s.centerMarker) s.centerMarker.map = null;
      s.centerMarker = null;
      s.map = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const s = stateRef.current;
    s.radiusKm = radiusKm;
    if (s.circleLayer && s.circleCenter) {
      s.circleLayer.setRadius(radiusKm * 1000);
      onZoneChange({
        circle: { center: s.circleCenter, radiusKm },
        label: `${radiusKm}км радиус`,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radiusKm]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-[500]
        bg-gray-900/75 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm whitespace-nowrap">
        Газрын зурагт дарж байршлаа тэмдэглэнэ үү
      </div>
    </div>
  );
});

ZoneMap.displayName = "ZoneMap";
export default ZoneMap;
