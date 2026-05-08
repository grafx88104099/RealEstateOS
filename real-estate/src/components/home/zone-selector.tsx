"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import type { SelectedZone, ZoneMapHandle } from "./zone-map";

const ZoneMap = dynamic(() => import("./zone-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-xl">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

const RADIUS_OPTIONS = [1, 2, 3, 5, 10];

interface ZoneSelectorProps {
  currentZone: SelectedZone | null;
  onApply: (zone: SelectedZone | null) => void;
  onClose: () => void;
}

export default function ZoneSelector({ currentZone, onApply, onClose }: ZoneSelectorProps) {
  const [radiusKm, setRadiusKm] = useState(currentZone?.circle.radiusKm ?? 2);
  const [pendingZone, setPendingZone] = useState<SelectedZone | null>(currentZone);
  const zoneMapRef = useRef<ZoneMapHandle>(null);

  function handleRadiusChange(km: number) {
    setRadiusKm(km);
    zoneMapRef.current?.setRadius(km);
  }

  function handleClear() {
    zoneMapRef.current?.clearZone();
    setPendingZone(null);
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 p-4"
      style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden"
        style={{ height: 580 }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="font-bold text-gray-900 text-base">Хайлтын бүс сонгох</h2>
            <p className="text-xs text-gray-400 mt-0.5">Газрын зурагт дарж байршлаа тэмдэглэн радиусаа сонгоно</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Radius controls */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 flex-shrink-0 flex-wrap">
          <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <circle cx="12" cy="12" r="9" strokeWidth={2} />
            <circle cx="12" cy="12" r="1" fill="currentColor" />
          </svg>
          <span className="text-sm font-medium text-gray-700">Радиус:</span>
          <div className="flex items-center gap-1">
            {RADIUS_OPTIONS.map((km) => (
              <button key={km} onClick={() => handleRadiusChange(km)}
                className={`w-10 h-7 rounded-lg text-xs font-semibold transition-all ${
                  radiusKm === km
                    ? "bg-blue-600 text-white shadow-sm scale-105"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}>
                {km}км
              </button>
            ))}
          </div>

          {pendingZone && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full font-medium">
                📍 {pendingZone.label}
              </span>
              <button onClick={handleClear} className="text-gray-400 hover:text-red-500 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Map */}
        <div className="flex-1 overflow-hidden">
          <ZoneMap
            ref={zoneMapRef}
            radiusKm={radiusKm}
            onZoneChange={setPendingZone}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <p className="text-xs text-gray-400">Цэг дарж байршил тавиад радиусаа сонгоно</p>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
              Болих
            </button>
            <button onClick={() => { onApply(pendingZone); onClose(); }}
              disabled={!pendingZone}
              className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Хэрэглэх
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
