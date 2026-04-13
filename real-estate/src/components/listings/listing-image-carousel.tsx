"use client";

import { useState } from "react";

interface ListingImageCarouselProps {
  images: string[];
  title: string;
}

export function ListingImageCarousel({ images, title }: ListingImageCarouselProps) {
  const [current, setCurrent] = useState(0);

  if (images.length === 0) return null;

  return (
    <div className="relative rounded-2xl overflow-hidden bg-gray-900">
      {/* Main image */}
      <div className="aspect-[16/10] relative">
        <img
          src={images[current]}
          alt={`${title} - ${current + 1}`}
          className="w-full h-full object-cover"
        />

        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => setCurrent((p) => (p === 0 ? images.length - 1 : p - 1))}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              onClick={() => setCurrent((p) => (p === images.length - 1 ? 0 : p + 1))}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </>
        )}

        {/* Counter */}
        <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs font-medium px-2.5 py-1 rounded-full">
          {current + 1} / {images.length}
        </div>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-1.5 p-2 bg-gray-900 overflow-x-auto">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={`shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-colors ${
                idx === current ? "border-white" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
