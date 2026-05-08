"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { UB_CENTER } from "@/lib/constants/districts";

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
    map: null as import("leaflet").Map | null,
    L: null as typeof import("leaflet") | null,
    circleLayer: null as import("leaflet").Circle | null,
    centerMarker: null as import("leaflet").Marker | null,
    circleCenter: null as [number, number] | null,
    radiusKm: 2,
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
    s.circleLayer?.remove(); s.circleLayer = null;
    s.centerMarker?.remove(); s.centerMarker = null;
    s.circleCenter = null;
  }

  useEffect(() => {
    if (!containerRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((containerRef.current as any)._leaflet_id) return;

    import("leaflet").then((L) => {
      if (!containerRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((containerRef.current as any)._leaflet_id) return;

      const s = stateRef.current;
      s.L = L;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;

      const map = L.map(containerRef.current, { zoomControl: true }).setView(UB_CENTER, 12);
      s.map = map;
      map.getContainer().style.cursor = "crosshair";

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap", maxZoom: 19,
      }).addTo(map);

      map.on("click", (e: import("leaflet").LeafletMouseEvent) => {
        const center: [number, number] = [e.latlng.lat, e.latlng.lng];
        s.circleCenter = center;

        s.circleLayer?.remove();
        s.centerMarker?.remove();

        s.circleLayer = L.circle([center[0], center[1]], {
          radius: s.radiusKm * 1000,
          color: "#2563eb", fillColor: "#93c5fd",
          fillOpacity: 0.25, weight: 2,
        }).addTo(map);

        s.centerMarker = L.marker([center[0], center[1]], {
          icon: L.divIcon({
            className: "",
            html: `<div style="width:14px;height:14px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>`,
            iconAnchor: [7, 7],
          }),
        }).addTo(map);

        onZoneChange({
          circle: { center, radiusKm: s.radiusKm },
          label: `${s.radiusKm}км радиус`,
        });
      });
    });

    return () => {
      stateRef.current.map?.remove();
      stateRef.current.map = null;
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
